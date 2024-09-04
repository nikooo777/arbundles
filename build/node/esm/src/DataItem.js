import { byteArrayToLong } from "./utils.js";
import base64url from "base64url";
import { Buffer } from "buffer";
import { sign } from "./ar-data-bundle.js";
import { indexToType } from "./signing/index.js";
import getSignatureData from "./ar-data-base.js";
import { SIG_CONFIG, SignatureConfig } from "./constants.js";
import { getCryptoDriver } from "./nodeUtils.js";
import { deserializeTags } from "./tags.js";
import { createHash } from "crypto";
export const MIN_BINARY_SIZE = 80;
export const MAX_TAG_BYTES = 4096;
export class DataItem {
    binary;
    _id;
    constructor(binary) {
        this.binary = binary;
    }
    static isDataItem(obj) {
        return obj.binary !== undefined;
    }
    get signatureType() {
        const signatureTypeVal = byteArrayToLong(this.binary.subarray(0, 2));
        if (SignatureConfig?.[signatureTypeVal] !== undefined) {
            return signatureTypeVal;
        }
        throw new Error("Unknown signature type: " + signatureTypeVal);
    }
    async isValid() {
        return DataItem.verify(this.binary);
    }
    get id() {
        return base64url.encode(this.rawId);
    }
    set id(id) {
        this._id = base64url.toBuffer(id);
    }
    get rawId() {
        return createHash("sha256").update(this.rawSignature).digest();
    }
    set rawId(id) {
        this._id = id;
    }
    get rawSignature() {
        return this.binary.subarray(2, 2 + this.signatureLength);
    }
    get signature() {
        return base64url.encode(this.rawSignature);
    }
    set rawOwner(pubkey) {
        if (pubkey.byteLength != this.ownerLength)
            throw new Error(`Expected raw owner (pubkey) to be ${this.ownerLength} bytes, got ${pubkey.byteLength} bytes.`);
        this.binary.set(pubkey, 2 + this.signatureLength);
    }
    get rawOwner() {
        return this.binary.subarray(2 + this.signatureLength, 2 + this.signatureLength + this.ownerLength);
    }
    get signatureLength() {
        return SIG_CONFIG[this.signatureType].sigLength;
    }
    get owner() {
        return base64url.encode(this.rawOwner);
    }
    get ownerLength() {
        return SIG_CONFIG[this.signatureType].pubLength;
    }
    get rawTarget() {
        const targetStart = this.getTargetStart();
        const isPresent = this.binary[targetStart] == 1;
        return isPresent ? this.binary.subarray(targetStart + 1, targetStart + 33) : Buffer.alloc(0);
    }
    get target() {
        return base64url.encode(this.rawTarget);
    }
    get rawAnchor() {
        const anchorStart = this.getAnchorStart();
        const isPresent = this.binary[anchorStart] == 1;
        return isPresent ? this.binary.subarray(anchorStart + 1, anchorStart + 33) : Buffer.alloc(0);
    }
    get anchor() {
        return base64url.encode(this.rawAnchor); /* .toString(); */
    }
    get rawTags() {
        const tagsStart = this.getTagsStart();
        const tagsSize = byteArrayToLong(this.binary.subarray(tagsStart + 8, tagsStart + 16));
        return this.binary.subarray(tagsStart + 16, tagsStart + 16 + tagsSize);
    }
    get tags() {
        const tagsStart = this.getTagsStart();
        const tagsCount = byteArrayToLong(this.binary.subarray(tagsStart, tagsStart + 8));
        if (tagsCount == 0) {
            return [];
        }
        const tagsSize = byteArrayToLong(this.binary.subarray(tagsStart + 8, tagsStart + 16));
        return deserializeTags(Buffer.from(this.binary.subarray(tagsStart + 16, tagsStart + 16 + tagsSize)));
    }
    get tagsB64Url() {
        const _tags = this.tags;
        return _tags.map((t) => ({
            name: base64url.encode(t.name),
            value: base64url.encode(t.value),
        }));
    }
    getStartOfData() {
        const tagsStart = this.getTagsStart();
        const numberOfTagBytesArray = this.binary.subarray(tagsStart + 8, tagsStart + 16);
        const numberOfTagBytes = byteArrayToLong(numberOfTagBytesArray);
        return tagsStart + 16 + numberOfTagBytes;
    }
    get rawData() {
        const tagsStart = this.getTagsStart();
        const numberOfTagBytesArray = this.binary.subarray(tagsStart + 8, tagsStart + 16);
        const numberOfTagBytes = byteArrayToLong(numberOfTagBytesArray);
        const dataStart = tagsStart + 16 + numberOfTagBytes;
        return this.binary.subarray(dataStart, this.binary.length);
    }
    get data() {
        return base64url.encode(this.rawData);
    }
    /**
     * UNSAFE!!
     * DO NOT MUTATE THE BINARY ARRAY. THIS WILL CAUSE UNDEFINED BEHAVIOUR.
     */
    getRaw() {
        return this.binary;
    }
    async sign(signer) {
        this._id = await sign(this, signer);
        return this.rawId;
    }
    async setSignature(signature) {
        this.binary.set(signature, 2);
        this._id = Buffer.from(await getCryptoDriver().hash(signature));
    }
    isSigned() {
        return (this._id?.length ?? 0) > 0;
    }
    /**
     * Returns a JSON representation of a DataItem
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    toJSON() {
        return {
            signature: this.signature,
            owner: this.owner,
            target: this.target,
            tags: this.tags.map((t) => ({
                name: base64url.encode(t.name),
                value: base64url.encode(t.value),
            })),
            data: this.data,
        };
    }
    /**
     * Verifies a `Buffer` and checks it fits the format of a DataItem
     *
     * A binary is valid iff:
     * - the tags are encoded correctly
     */
    static async verify(buffer) {
        if (buffer.byteLength < MIN_BINARY_SIZE) {
            return false;
        }
        const item = new DataItem(buffer);
        const sigType = item.signatureType;
        const tagsStart = item.getTagsStart();
        const numberOfTags = byteArrayToLong(buffer.subarray(tagsStart, tagsStart + 8));
        const numberOfTagBytesArray = buffer.subarray(tagsStart + 8, tagsStart + 16);
        const numberOfTagBytes = byteArrayToLong(numberOfTagBytesArray);
        if (numberOfTagBytes > MAX_TAG_BYTES)
            return false;
        if (numberOfTags > 0) {
            try {
                const tags = deserializeTags(Buffer.from(buffer.subarray(tagsStart + 16, tagsStart + 16 + numberOfTagBytes)));
                if (tags.length !== numberOfTags) {
                    return false;
                }
            }
            catch (e) {
                return false;
            }
        }
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const Signer = indexToType[sigType];
        const signatureData = await getSignatureData(item);
        return await Signer.verify(item.rawOwner, signatureData, item.rawSignature);
    }
    async getSignatureData() {
        return getSignatureData(this);
    }
    /**
     * Returns the start byte of the tags section (number of tags)
     *
     * @private
     */
    getTagsStart() {
        const targetStart = this.getTargetStart();
        const targetPresent = this.binary[targetStart] == 1;
        let tagsStart = targetStart + (targetPresent ? 33 : 1);
        const anchorPresent = this.binary[tagsStart] == 1;
        tagsStart += anchorPresent ? 33 : 1;
        return tagsStart;
    }
    /**
     * Returns the start byte of the tags section (number of tags)
     *
     * @private
     */
    getTargetStart() {
        return 2 + this.signatureLength + this.ownerLength;
    }
    /**
     * Returns the start byte of the tags section (number of tags)
     *
     * @private
     */
    getAnchorStart() {
        let anchorStart = this.getTargetStart() + 1;
        const targetPresent = this.binary[this.getTargetStart()] == 1;
        anchorStart += targetPresent ? 32 : 0;
        return anchorStart;
    }
}
export default DataItem;
//# sourceMappingURL=DataItem.js.map