import { DomainError } from "./errors";
export function assertTransactionTopology(hello: {
  setName?: string;
  msg?: string;
}) {
  if (!hello.setName && hello.msg !== "isdbgrid")
    throw new DomainError(
      "MongoDB transactions require a replica set. For local development run npm run dev:db:start and wait for PRIMARY READY; standalone MongoDB is unsupported.",
      503,
    );
}
