/* eslint-disable @typescript-eslint/no-explicit-any */
import level, { LevelDB } from 'level'
import { join } from 'path'

import { UtxoStore, UtxoResult, UtxoReturnResult } from './storage'
import { calcUtxoId } from '../helpers'
import { Utxo, UtxoId } from 'src/cashweb/types/utxo'

const metadataKeys = {
  schemaVersion: 'schemaVersion',
  lastServerTime: 'lastServerTime',
}

class OutpointIterator implements AsyncIterableIterator<Utxo> {
  iterator: any
  db: LevelDB
  onlyFrozen: boolean

  constructor(db: LevelDB, onlyFrozen = false) {
    this.db = db
    this.onlyFrozen = onlyFrozen
  }

  async next(): Promise<IteratorResult<Utxo>> {
    const value = await new Promise<void | Utxo>((resolve, reject) => {
      this.iterator.next((error: Error, key: string, value: string) => {
        if (error) {
          reject(error)
        }
        if (!key) {
          this.iterator.end((error: Error) => {
            if (error) {
              reject(error)
            }
            resolve()
          })
          resolve()
          return
        }
        const parsedOutpoint: Utxo = JSON.parse(value)
        resolve(parsedOutpoint)
      })
    })
    if (!value) {
      return new UtxoReturnResult()
    }
    if (!this.onlyFrozen && value.frozen) {
      return this.next()
    }
    if (this.onlyFrozen && !value.frozen) {
      return this.next()
    }

    return new UtxoResult(value)
  }

  async return(): Promise<IteratorResult<Utxo>> {
    return new Promise((resolve, reject) => {
      this.iterator.end((error: Error) => {
        this.db.close()
        if (error) {
          reject(error)
        }
        resolve({ done: true, value: undefined })
      })
    })
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<Utxo> {
    this.iterator = this.db.iterator({})
    return this
  }
}

const currentSchemaVersion = 1

export class LevelUtxoStore implements UtxoStore {
  private utxoDbLocation: string
  private metadataDbLocation: string
  private schemaVersion?: number
  private openedDb?: LevelDB
  private cache: Map<UtxoId, Utxo>
  private deletedUtxos: Set<UtxoId>

  constructor(location: string) {
    this.utxoDbLocation = join(location, 'outpoints')
    this.metadataDbLocation = join(location, 'metadata')
    this.cache = new Map<UtxoId, Utxo>()
    this.deletedUtxos = new Set<UtxoId>()
  }

  get db() {
    if (!this.openedDb) {
      throw new Error('No db opened')
    }
    return this.openedDb
  }

  async Open() {
    this.openedDb = level(this.utxoDbLocation)
    const dbSchemaVersion = await this.getSchemaVersion()
    if (!dbSchemaVersion) {
      await this.setSchemaVersion(currentSchemaVersion)
    } else if (dbSchemaVersion < currentSchemaVersion) {
      console.warn('Outdated DB, may need migration')
    } else if (dbSchemaVersion > currentSchemaVersion) {
      console.warn('Newer DB found. Client downgraded?')
    }
  }

  async Close() {
    this.db.close()
  }

  private getMetadataDatabase() {
    return level(this.metadataDbLocation)
  }

  getById(id: UtxoId): Utxo | undefined {
    return this.cache.get(id)
  }

  deleteById(id: UtxoId) {
    this.cache.delete(id)
    this.deletedUtxos.add(id)
    // TODO: Handle errors here.
    this.db
      .del(id)
      .catch(err => console.error('Trying to delete already deleted utxo', err))
  }

  put(outpoint: Utxo) {
    const index = calcUtxoId(outpoint)
    if (this.deletedUtxos.has(index)) {
      return
    }
    this.cache.set(index, outpoint)
    this.db.put(index, JSON.stringify(outpoint))
  }

  freezeById(utxoId: UtxoId) {
    if (this.deletedUtxos.has(utxoId)) {
      return
    }
    const utxo = this.getById(utxoId)
    if (utxo === undefined) {
      console.error(`trying to freeze non-existant utxo ${utxoId}`)
      return
    }
    utxo.frozen = true
    this.put(utxo)
  }

  unfreezeById(utxoId: UtxoId) {
    const utxo = this.getById(utxoId)
    if (utxo === undefined) {
      console.error(`trying to unfreeze non-existant utxo ${utxoId}`)
      return
    }
    utxo.frozen = false
    this.put(utxo)
  }

  private async getSchemaVersion(): Promise<number> {
    if (this.schemaVersion) {
      return this.schemaVersion
    }

    const db = this.getMetadataDatabase()
    try {
      const valueString: string = await db.get(metadataKeys.schemaVersion)
      return JSON.parse(valueString)
    } catch (err: any) {
      if (err.type === 'NotFoundError') {
        return 0
      }
      throw err
    } finally {
      db.close()
    }
  }

  private async setSchemaVersion(schemaVersion: number) {
    const db = this.getMetadataDatabase()
    try {
      await db.put(metadataKeys.schemaVersion, JSON.stringify(schemaVersion))
      // Update cache
      this.schemaVersion = schemaVersion
    } finally {
      db.close()
    }
  }

  getUtxoMap(): Map<string, Utxo> {
    return this.cache
  }

  async utxosIter(): Promise<AsyncIterableIterator<Utxo>> {
    return new OutpointIterator(this.db, false)
  }

  async frozenUtxosIter(): Promise<AsyncIterableIterator<Utxo>> {
    return new OutpointIterator(this.db, true)
  }

  async loadData(): Promise<void> {
    const outpointIterator = await this.utxosIter()
    for await (const outpoint of outpointIterator) {
      this.cache.set(calcUtxoId(outpoint), outpoint)
    }
  }

  /**
   * This will delete everything in the store! Don't call it by accident!
   */
  async clear() {
    this.cache = new Map<UtxoId, Utxo>()
    this.deletedUtxos = new Set<UtxoId>()
    await this.db.clear()
    await this.getMetadataDatabase().clear()
  }
}
