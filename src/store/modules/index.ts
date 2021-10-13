import appearance, { State as AppearanceState } from './appearance'
import chats, { State as ChatsState } from './chats'
import contacts, { State as ContactsState } from './contacts'
import myProfile, { State as MyProfileState } from './my_profile'
import relayClient, { State as RelayState } from './relay_client'
import wallet, { State as WalletState } from './wallet'

const modules = {
  appearance,
  chats,
  contacts,
  myProfile,
  relayClient,
  wallet
}

export type RootState = {
  restored: Promise<boolean>;
  storeMetadata?: {
    networkName?: string,
    version?: number,
  }
  appearance: AppearanceState;
  chats: ChatsState
  contacts: ContactsState
  myProfile: MyProfileState
  relayClient: RelayState
  wallet: WalletState
}

export default modules
