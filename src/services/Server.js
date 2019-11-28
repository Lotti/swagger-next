const log4js = require(`log4js`);
const log = log4js.getLogger(`server`);

const path = require(`path`);
const fs = require(`fs`);
const http = require(`http`);
// const https = require('https');
const express = require(`express`);
const bodyParser = require(`body-parser`);
const compression = require(`compression`);
const errorhandler = require(`errorhandler`);
const oasTools = require(`oas-tools`);
const jsyaml = require(`js-yaml`);
const next = require(`next`);

const dev = !process.env.NODE_ENV || process.env.NODE_ENV.toLowerCase() !== `production`;
const basicAuthUsername = process.env.BASIC_AUTH_USERNAME || false;
const basicAuthPassword = process.env.BASIC_AUTH_PASSWORD || false;

class Server {
    constructor(autoRun = true) {
        this.port = process.env.PORT || 3000;

        this.next = next({dev});
        this.handle = this.next.getRequestHandler();
        this.app = express();

        log.info(`Starting next server...`);
        this.next.prepare().then(() => {
            log.info(`Starting next server... done!`);
            this.app.set(`port`, this.port);
            this.app.use(bodyParser.json({strict: false, limit: `10mb`}));
            this.app.use(compression());
            this.httpServer = http.createServer(this.app);
            /*
            const options = {
              key: fs.readFileSync('/path/to/key.pem'),
              cert: fs.readFileSync('/path/to/cert.pem'),
            };
            this.httpsServer = https.createServer(options, this.app);
            */

            if (dev) {
                this.app.use(errorhandler());
            } else {
                this.app.use((err, req, res, next) => {
                    const status = err.status || 500;
                    if (dev) {
                        log.error(`Request Error`, err);
                        res.status(status).end(err.message);
                    } else {
                        res.status(status).end();
                    }
                });
            }

            // SWAGGER
            const swaggerLog = log4js.getLogger(`swagger`);
            swaggerLog.warning = swaggerLog.warn;
            swaggerLog.level = `warn`;

            const spec = fs.readFileSync(path.join(__dirname, `..`, `..`, `swagger.yaml`), `utf8`);
            this.swaggerDoc = jsyaml.safeLoad(spec);
            this.options_object = {
                controllers: path.join(__dirname, `..`, `controllers`),
                customLogger: swaggerLog,
                strict: false,
                router: true,
                validator: true,
                docs: false,
                oasSecurity: true,
                securityFile: {
                    BasicAuth: (req, secDef, token, next) => {
                        let auth = req.headers.authorization || req.headers.Authorization;
                        if (auth && auth.replace) {
                            auth = auth.replace(/^[b|B]asic\s/, ``);
                            const base64 = Buffer.from(`${basicAuthUsername}:${basicAuthPassword}`, `utf8`).toString(`base64`);
                            if (basicAuthUsername && basicAuthPassword && auth === base64) {
                                return next();
                            }
                        }
                        return req.res.status(403).send({error: true, code: 403, message: `invalid credentials`});
                    }
                }
            };

            if (dev) {
                this.options_object.docs = {
                    apiDocs: `/api-docs`,
                    apiDocsPrefix: ``,
                    swaggerUi: `/docs`,
                    swaggerUiPrefix: ``,
                };
            }

            oasTools.configure(this.options_object);
            oasTools.initialize(this.swaggerDoc, this.app, (error) => {
                if (error) {
                    log.error(error);
                } else {
                    log.info(`Swagger initialized`);

                    // for all the react stuff
                    this.app.get(`*`, (req, res) => {
                        return this.handle(req, res);
                    });

                    if (autoRun) {
                        this.run();
                    }
                }
            });
            // END SWAGGER
        }).catch(log.error);
    }

    /**
     * Static method to return the same instance
     */
    static INSTANCE() {
        if (!Server.instance) {
            Server.instance = new Server();
        }
        return Server.instance;
    }

    run() {
        this.httpServer.listen(this.port, () => {
            log.info(`App running in ${dev ? `DEV` : `PRODUCTION`} mode at localhost:${this.port}`);
            if (this.options_object.docs !== false) {
                log.info(`API docs (Swagger UI) available on localhost:${this.port}/docs`);
            }
        });
    }

    getHttpServer() {
        return this.httpServer;
    }

    getApp() {
        return this.app;
    }

    getHandle() {
        return this.handle;
    }
}

module.exports = Server;
