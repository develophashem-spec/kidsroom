/**
 * Runs before every integration test file. Points the app at a disposable database and
 * refuses to continue unless its name ends in `_test` (the tests drop the whole database).
 */
const uri = process.env.TEST_MONGODB_URI ?? "mongodb://127.0.0.1:27017/thefit_test";

const databaseName = new URL(uri).pathname.replace(/^\//, "");
if (!databaseName.endsWith("_test")) {
  throw new Error(
    `Refusing to run integration tests against "${databaseName}": the database name must end with "_test".`,
  );
}

process.env.MONGODB_URI = uri;
process.env.AUTH_SECRET = "integration-test-secret-integration-test-secret";
process.env.BCRYPT_ROUNDS = "4";
