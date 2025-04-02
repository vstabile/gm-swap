import { AccountManager } from "applesauce-accounts";
import { registerCommonAccountTypes } from "applesauce-accounts/accounts";

// create an account manager instance
export const accounts = new AccountManager();

// Adds the common account types to the manager
registerCommonAccountTypes(accounts);
