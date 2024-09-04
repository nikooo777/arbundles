"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileDataItem = void 0;
const base64url_1 = __importDefault(require("base64url"));
const fs_1 = require("fs");
const utils_1 = require("../utils");
const index_1 = require("../index");
const utils_2 = require("../nodeUtils.js");
const index_2 = require("../signing/index");
const axios_1 = __importDefault(require("axios"));
const constants_1 = require("../constants");
const util_1 = require("util");
const tags_1 = require("../tags");
const read = (0, util_1.promisify)(fs_1.read);
const write = (0, util_1.promisify)(fs_1.write);
class FileDataItem {
    signatureLength() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const type = yield this.signatureType();
            const length = (_a = constants_1.SIG_CONFIG[type]) === null || _a === void 0 ? void 0 : _a.sigLength;
            if (!length)
                throw new Error("Signature type not supported");
            return length;
        });
    }
    ownerLength() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const length = (_a = constants_1.SIG_CONFIG[yield this.signatureType()]) === null || _a === void 0 ? void 0 : _a.pubLength;
            if (!length)
                throw new Error("Signature type not supported");
            return length;
        });
    }
    constructor(filename, id) {
        this.filename = filename;
        this._id = id;
    }
    get id() {
        if (!this._id)
            throw new Error("FileDataItem - ID is undefined");
        return base64url_1.default.encode(this._id);
    }
    get rawId() {
        if (this._id) {
            return this._id;
        }
        throw new Error("ID is not set");
    }
    set rawId(id) {
        this._id = id;
    }
    static isDataItem(obj) {
        // return obj?.filename ? typeof obj.filename === "string" : false;
        return obj instanceof FileDataItem;
    }
    static verify(filename) {
        return __awaiter(this, void 0, void 0, function* () {
            const handle = yield fs_1.promises.open(filename, "r");
            const item = new FileDataItem(filename);
            const sigType = yield item.signatureType();
            const tagsStart = yield item.getTagsStart();
            const numberOfTags = yield read(handle.fd, Buffer.allocUnsafe(8), 0, 8, tagsStart).then((r) => (0, utils_1.byteArrayToLong)(r.buffer));
            const numberOfTagsBytes = yield read(handle.fd, Buffer.allocUnsafe(8), 0, 8, tagsStart + 8).then((r) => (0, utils_1.byteArrayToLong)(r.buffer));
            if (numberOfTagsBytes > index_1.MAX_TAG_BYTES) {
                yield handle.close();
                return false;
            }
            const tagsBytes = yield read(handle.fd, Buffer.allocUnsafe(numberOfTagsBytes), 0, numberOfTagsBytes, tagsStart + 16).then((r) => r.buffer);
            if (numberOfTags > 0) {
                try {
                    (0, tags_1.deserializeTags)(tagsBytes);
                }
                catch (e) {
                    yield handle.close();
                    return false;
                }
            }
            const Signer = index_2.indexToType[sigType];
            const owner = yield item.rawOwner();
            const signatureData = yield (0, index_1.deepHash)([
                (0, utils_2.stringToBuffer)("dataitem"),
                (0, utils_2.stringToBuffer)("1"),
                (0, utils_2.stringToBuffer)(sigType.toString()),
                owner,
                yield item.rawTarget(),
                yield item.rawAnchor(),
                yield item.rawTags(),
                (0, fs_1.createReadStream)(filename, {
                    start: yield item.dataStart(),
                }),
            ]);
            const sig = yield item.rawSignature();
            if (!(yield Signer.verify(owner, signatureData, sig))) {
                yield handle.close();
                return false;
            }
            yield handle.close();
            return true;
        });
    }
    isValid() {
        return FileDataItem.verify(this.filename);
    }
    isSigned() {
        return this._id !== undefined;
    }
    size() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield fs_1.promises.stat(this.filename).then((r) => r.size);
        });
    }
    signatureType() {
        return __awaiter(this, void 0, void 0, function* () {
            const handle = yield fs_1.promises.open(this.filename, "r");
            const buffer = yield read(handle.fd, Buffer.allocUnsafe(2), 0, 2, 0).then((r) => r.buffer);
            yield handle.close();
            return (0, utils_1.byteArrayToLong)(buffer);
        });
    }
    rawSignature() {
        return __awaiter(this, void 0, void 0, function* () {
            const handle = yield fs_1.promises.open(this.filename, "r");
            const length = yield this.signatureLength();
            const buffer = yield read(handle.fd, Buffer.alloc(length), 0, length, 2).then((r) => r.buffer);
            yield handle.close();
            return buffer;
        });
    }
    signature() {
        return __awaiter(this, void 0, void 0, function* () {
            return base64url_1.default.encode(yield this.rawSignature());
        });
    }
    rawOwner() {
        return __awaiter(this, void 0, void 0, function* () {
            const handle = yield fs_1.promises.open(this.filename, "r");
            const length = yield this.ownerLength();
            const buffer = yield read(handle.fd, Buffer.allocUnsafe(length), 0, length, 2 + (yield this.signatureLength())).then((r) => r.buffer);
            yield handle.close();
            return buffer;
        });
    }
    owner() {
        return __awaiter(this, void 0, void 0, function* () {
            return base64url_1.default.encode(yield this.rawOwner());
        });
    }
    rawTarget() {
        return __awaiter(this, void 0, void 0, function* () {
            const handle = yield fs_1.promises.open(this.filename, "r");
            const targetStart = yield this.getTargetStart();
            const targetPresentBuffer = yield read(handle.fd, Buffer.allocUnsafe(1), 0, 1, targetStart).then((r) => r.buffer);
            const targetPresent = targetPresentBuffer[0] === 1;
            if (targetPresent) {
                const targetBuffer = yield read(handle.fd, Buffer.allocUnsafe(32), 0, 32, targetStart + 1).then((r) => r.buffer);
                yield handle.close();
                return targetBuffer;
            }
            yield handle.close();
            return Buffer.allocUnsafe(0);
        });
    }
    target() {
        return __awaiter(this, void 0, void 0, function* () {
            return base64url_1.default.encode(yield this.rawTarget());
        });
    }
    getTargetStart() {
        return __awaiter(this, void 0, void 0, function* () {
            return 2 + (yield this.signatureLength()) + (yield this.ownerLength());
        });
    }
    rawAnchor() {
        return __awaiter(this, void 0, void 0, function* () {
            const [anchorPresent, anchorStart] = yield this.anchorStart();
            if (anchorPresent) {
                const handle = yield fs_1.promises.open(this.filename, "r");
                const anchorBuffer = yield read(handle.fd, Buffer.allocUnsafe(32), 0, 32, anchorStart + 1).then((r) => r.buffer);
                yield handle.close();
                return anchorBuffer;
            }
            return Buffer.allocUnsafe(0);
        });
    }
    anchor() {
        return __awaiter(this, void 0, void 0, function* () {
            return base64url_1.default.encode(yield this.rawAnchor());
        });
    }
    rawTags() {
        return __awaiter(this, void 0, void 0, function* () {
            const handle = yield fs_1.promises.open(this.filename, "r");
            const tagsStart = yield this.getTagsStart();
            const numberOfTagsBuffer = yield read(handle.fd, Buffer.allocUnsafe(8), 0, 8, tagsStart).then((r) => r.buffer);
            const numberOfTags = (0, utils_1.byteArrayToLong)(numberOfTagsBuffer);
            if (numberOfTags === 0) {
                yield handle.close();
                return Buffer.allocUnsafe(0);
            }
            const numberOfTagsBytesBuffer = yield read(handle.fd, Buffer.allocUnsafe(8), 0, 8, tagsStart + 8).then((r) => r.buffer);
            const numberOfTagsBytes = (0, utils_1.byteArrayToLong)(numberOfTagsBytesBuffer);
            if (numberOfTagsBytes > index_1.MAX_TAG_BYTES) {
                yield handle.close();
                throw new Error("Tags too large");
            }
            const tagsBytes = yield read(handle.fd, Buffer.allocUnsafe(numberOfTagsBytes), 0, numberOfTagsBytes, tagsStart + 16).then((r) => r.buffer);
            yield handle.close();
            return tagsBytes;
        });
    }
    tags() {
        return __awaiter(this, void 0, void 0, function* () {
            const tagsBytes = yield this.rawTags();
            if (tagsBytes.byteLength === 0)
                return [];
            return (0, tags_1.deserializeTags)(tagsBytes);
        });
    }
    rawData() {
        return __awaiter(this, void 0, void 0, function* () {
            const dataStart = yield this.dataStart();
            const size = yield this.size();
            const dataSize = size - dataStart;
            if (dataSize === 0) {
                return Buffer.allocUnsafe(0);
            }
            const handle = yield fs_1.promises.open(this.filename, "r");
            const dataBuffer = yield read(handle.fd, Buffer.allocUnsafe(dataSize), 0, dataSize, dataStart).then((r) => r.buffer);
            yield handle.close();
            return dataBuffer;
        });
    }
    data() {
        return __awaiter(this, void 0, void 0, function* () {
            return base64url_1.default.encode(yield this.rawData());
        });
    }
    sign(signer) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataStart = yield this.dataStart();
            const signatureData = yield (0, index_1.deepHash)([
                (0, utils_2.stringToBuffer)("dataitem"),
                (0, utils_2.stringToBuffer)("1"),
                (0, utils_2.stringToBuffer)((yield this.signatureType()).toString()),
                yield this.rawOwner(),
                yield this.rawTarget(),
                yield this.rawAnchor(),
                yield this.rawTags(),
                (0, fs_1.createReadStream)(this.filename, { start: dataStart }),
            ]);
            const signatureBytes = yield signer.sign(signatureData);
            const idBytes = yield (0, utils_2.getCryptoDriver)().hash(signatureBytes);
            const handle = yield fs_1.promises.open(this.filename, "r+");
            yield write(handle.fd, signatureBytes, 0, yield this.signatureLength(), 2);
            this.rawId = Buffer.from(idBytes);
            yield handle.close();
            return Buffer.from(idBytes);
        });
    }
    /**
     * @deprecated Since version 0.3.0. Will be deleted in version 0.4.0. Use @bundlr-network/client package instead to interact with Bundlr
     */
    sendToBundler(bundler) {
        return __awaiter(this, void 0, void 0, function* () {
            const headers = {
                "Content-Type": "application/octet-stream",
            };
            if (!this.isSigned())
                throw new Error("You must sign before sending to bundler");
            const response = yield axios_1.default.post(`${bundler}/tx`, (0, fs_1.createReadStream)(this.filename), {
                headers,
                timeout: 100000,
                maxBodyLength: Infinity,
                validateStatus: (status) => (status > 200 && status < 300) || status !== 402,
            });
            if (response.status === 402)
                throw new Error("Not enough funds to send data");
            return response;
        });
    }
    getTagsStart() {
        return __awaiter(this, void 0, void 0, function* () {
            const [anchorPresent, anchorStart] = yield this.anchorStart();
            let tagsStart = anchorStart;
            tagsStart += anchorPresent ? 33 : 1;
            return tagsStart;
        });
    }
    dataStart() {
        return __awaiter(this, void 0, void 0, function* () {
            const handle = yield fs_1.promises.open(this.filename, "r");
            const tagsStart = yield this.getTagsStart();
            const numberOfTagsBytesBuffer = yield read(handle.fd, Buffer.allocUnsafe(8), 0, 8, tagsStart + 8).then((r) => r.buffer);
            const numberOfTagsBytes = (0, utils_1.byteArrayToLong)(numberOfTagsBytesBuffer);
            yield handle.close();
            return tagsStart + 16 + numberOfTagsBytes;
        });
    }
    anchorStart() {
        return __awaiter(this, void 0, void 0, function* () {
            const targetStart = yield this.getTargetStart();
            const handle = yield fs_1.promises.open(this.filename, "r");
            const targetPresentBuffer = yield read(handle.fd, Buffer.allocUnsafe(1), 0, 1, targetStart).then((r) => r.buffer);
            const targetPresent = targetPresentBuffer[0] === 1;
            const anchorStart = targetStart + (targetPresent ? 33 : 1);
            const anchorPresentBuffer = yield read(handle.fd, Buffer.allocUnsafe(1), 0, 1, anchorStart).then((r) => r.buffer);
            const anchorPresent = anchorPresentBuffer[0] === 1;
            yield handle.close();
            return [anchorPresent, anchorStart];
        });
    }
}
exports.FileDataItem = FileDataItem;
exports.default = FileDataItem;
//# sourceMappingURL=FileDataItem.js.map