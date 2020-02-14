const RetryWrapper = require("../miio/RetryWrapper");
const Status = require("../miio/Status");

/**
 * Common Base class for devices that can be controled by Valetudo.
 *
 * Yet incomplete. Only the Roborock implementation is authoritative atm.
 *
 * @param options {object}
 * @param options.localSocket {import("../miio/MiioSocket")}
 * @param options.cloudSocket {import("../miio/MiioSocket")}
 * @param options.events {import("events").EventEmitter}
 * @param options.ip {string} Remote IP
 * @param options.configuration {import('../Configuration')}
 * @param options.tokenProvider {function}
 * @constructor
 */
const MiioVacuum = function(options) {
    this.cloudSocket = options.cloudSocket;
    this.localRetryWrapper = new RetryWrapper(options.localSocket, options.tokenProvider);
    this.sendLocal = this.localRetryWrapper.sendMessage.bind(this.localRetryWrapper);

    this.configuration = options.configuration;
    this.mapUploadHost = this.configuration.get("map_upload_host");

    this.status = new Status();
    this.events = options.events;

    // Poll status once per minute.
    let pollStatusLoop = function() {
        let repollSeconds =
            MiioVacuum.FAST_MAP_PULLING_STATES.indexOf(this.status.state) !== -1 ? 2 : 60;
        setTimeout(() => this.pollStatus(pollStatusLoop), repollSeconds * 1000);
    }.bind(this);
    this.pollStatus(pollStatusLoop);
};

MiioVacuum.FAST_MAP_PULLING_STATES = [
    "REMOTE_CONTROL_ACTIVE", "CLEANING", "RETURNING_HOME", "MANUAL_MODE", "SPOT_CLEANING",
    "DOCKING", "GOING_TO_TARGET", "ZONED_CLEANING"
];

/**
 * Called when a message is received, either from cloud or local interface.
 * @param {any} msg the json object sent by the remote device
 * @returns boolean True if the message was handled.
 */
MiioVacuum.prototype.onMessage = function(msg) {
    return false;
};

/** Called once the dummycloud connection was established. */
MiioVacuum.prototype.onCloudConnected = function() {
    console.info("Cloud connected");
    // start polling the map after a brief delay of 3.5s
    setTimeout(() => this.pollMap(), 3500);
};

MiioVacuum.prototype.pollStatus = function(callback) {};

/** Poll the map. */
MiioVacuum.prototype.pollMap = function() {};

/** Initial preprocessing (e.g. decompression) of the map data. */
MiioVacuum.prototype.preprocessMap = function(data, callback) {};

/** Parse the preprocessed map data. */
MiioVacuum.prototype.parseMap = function(data) {};

/**
 * Sends a json object to cloud socket.
 * @return {Promise<object>}
 */
MiioVacuum.prototype.sendCloud = function(msg) {
    return this.cloudSocket.sendMessage(msg);
};

/**
 * Sends a request to local socket.
 * @param {string} method
 * @param {object|Array} params
 * @return {Promise<object>}
 */
MiioVacuum.prototype.sendLocalWithPromise = function(method, params = []) {
    return new Promise((resolve, reject) => {
        this.sendLocal(method, params, {}, (err, res) => {
            if (err)
                reject(err);
            else
                resolve(res);
        });
    });
};

MiioVacuum.prototype.shutdown = async function() {
    console.debug("MiioVacuum shutdown in progress...");
    await this.cloudSocket.shutdown();
    await this.localRetryWrapper.miioSocket.shutdown();
    console.debug("MiioVacuum shutdown done.");
};

MiioVacuum.prototype.getTokens = function() {
    return {
        cloud: this.cloudSocket.codec.token.toString("hex"),
        local: this.localRetryWrapper.miioSocket.codec.token.toString("hex")
    };
};

/**
 * Go back to the dock
 * Returns an error if there is one as the first parameter of the callback
 * On success, 2nd param of callback looks like this: 'ok'
 * @return {Promise<object>}
 */
MiioVacuum.prototype.driveHome = function() {
    return Promise.reject("not implemented");
};

module.exports = MiioVacuum;