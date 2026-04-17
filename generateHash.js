const bcrypt = require("bcrypt");

const password = "Admin121706";

bcrypt.hash(password, 12).then(hash => {
    console.log("\nNEW HASH:\n");
    console.log(hash);
});