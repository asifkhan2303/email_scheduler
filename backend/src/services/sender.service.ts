import { env } from "../config/env";

export interface Sender {
  /** Address shown in the "From" header and used as the rate-limit key. */
  address: string;
  user: string;
  password: string;
}

export const ROTATE = "rotate";

const primary: Sender = {
  address: env.emailFrom || env.etherealUser,
  user: env.etherealUser,
  password: env.etherealPassword
};

const extras: Sender[] = env.etherealExtraAccounts.map((account) => ({
  address: account.user,
  user: account.user,
  password: account.password
}));

export const senders: Sender[] = [primary, ...extras];

export function listSenderAddresses(): string[] {
  return senders.map((sender) => sender.address);
}

export function findSender(address: string): Sender | undefined {
  return senders.find((sender) => sender.address === address);
}

/** Picks the sender for the n-th email of a campaign. */
export function pickSender(choice: string, index: number): string {
  if (choice === ROTATE) return senders[index % senders.length].address;
  return choice;
}
