const path = require(`path`);
const log4js = require(`log4js`);
log4js.configure(path.join(__dirname, `log4js.json`));
const log = log4js.getLogger(`main`);

process.on(`unhandledRejection`, (error, p) => {
    log.warn(`=== UNHANDLED REJECTION ===`);
    console.dir(error.stack);
});

const Server = require(`./src/services/Server`);
Server.INSTANCE(true);

// const jq = require(`node-jq`);
// jq.run(`.foo`, { foo: `bar` }, { input: `json` }).then(console.log);
