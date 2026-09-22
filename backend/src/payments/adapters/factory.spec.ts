import { getGateway } from "./factory";

it.each(["staging", "production"])("disables the local payment stub in %s", environment => {
  const previous = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = environment;
    expect(() => getGateway("stub", {}, true, {} as any)).toThrow("only available locally");
  } finally { process.env.NODE_ENV = previous; }
});
