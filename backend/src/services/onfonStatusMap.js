function canonicalize(status) {
    return String(status || '').toLowerCase().replace(/[\s_]+/g, '');
}

const SENT = 'sent';
const FAILED = 'failed';
const PENDING = null;

const ONFON_DLR_STATUS_MAP = {
    deliveredtoterminal: SENT,
    delivrd: SENT,
    deliveredtonetwork: PENDING, // Network only (not handset)

    deliveryimpossible: FAILED,
    userinblacklist: FAILED,
    userabnormalstate: FAILED,
    userissuspended: FAILED,
    absentsubscriber: FAILED,
    sendernameblacklisted: FAILED,
    msisdnblacklisted: FAILED,
    expired: FAILED,
    invalidmsisdn: FAILED,
    undelivrd: FAILED,
    undeliv: FAILED,
    callbarred: FAILED,
    servicenotprovisioned: FAILED,
    systemfailure: FAILED,
    unknownsubscriber: FAILED,

    deliveryuncertain: PENDING,
    messagewaiting: PENDING,
    deliverynotificationnotsupported: PENDING,
    unknownerror: PENDING,

};

function resolveOnfonDlrStatus(rawStatus) {
    const key = canonicalize(rawStatus);
    if (Object.prototype.hasOwnProperty.call(ONFON_DLR_STATUS_MAP, key)) {
        return ONFON_DLR_STATUS_MAP[key];
    }
    return undefined;
}

module.exports = { resolveOnfonDlrStatus };