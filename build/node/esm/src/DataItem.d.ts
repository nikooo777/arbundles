/// <reference types="node" />
import { Buffer } from "buffer";
import type { BundleItem } from "./BundleItem.js";
import type { Signer } from "./signing/index.js";
import { SignatureConfig } from "./constants.js";
import type { Base64URLString } from "./types.js";
export declare const MIN_BINARY_SIZE = 80;
export declare const MAX_TAG_BYTES = 4096;
export declare class DataItem implements BundleItem {
    private readonly binary;
    private _id;
    constructor(binary: Buffer);
    static isDataItem(obj: any): obj is DataItem;
    get signatureType(): SignatureConfig;
    isValid(): Promise<boolean>;
    get id(): Base64URLString;
    set id(id: string);
    get rawId(): Buffer;
    set rawId(id: Buffer);
    get rawSignature(): Buffer;
    get signature(): Base64URLString;
    set rawOwner(pubkey: Buffer);
    get rawOwner(): Buffer;
    get signatureLength(): number;
    get owner(): Base64URLString;
    get ownerLength(): number;
    get rawTarget(): Buffer;
    get target(): Base64URLString;
    get rawAnchor(): Buffer;
    get anchor(): Base64URLString;
    get rawTags(): Buffer;
    get tags(): {
        name: string;
        value: string;
    }[];
    get tagsB64Url(): {
        name: Base64URLString;
        value: Base64URLString;
    }[];
    getStartOfData(): number;
    get rawData(): Buffer;
    get data(): Base64URLString;
    /**
     * UNSAFE!!
     * DO NOT MUTATE THE BINARY ARRAY. THIS WILL CAUSE UNDEFINED BEHAVIOUR.
     */
    getRaw(): Buffer;
    sign(signer: Signer): Promise<Buffer>;
    setSignature(signature: Buffer): Promise<void>;
    isSigned(): boolean;
    /**
     * Returns a JSON representation of a DataItem
     */
    toJSON(): {
        owner: string;
        data: string;
        signature: string;
        target: string;
        tags: {
            name: Base64URLString;
            value: Base64URLString;
        }[];
    };
    /**
     * Verifies a `Buffer` and checks it fits the format of a DataItem
     *
     * A binary is valid iff:
     * - the tags are encoded correctly
     */
    static verify(buffer: Buffer): Promise<boolean>;
    getSignatureData(): Promise<Uint8Array>;
    /**
     * Returns the start byte of the tags section (number of tags)
     *
     * @private
     */
    private getTagsStart;
    /**
     * Returns the start byte of the tags section (number of tags)
     *
     * @private
     */
    private getTargetStart;
    /**
     * Returns the start byte of the tags section (number of tags)
     *
     * @private
     */
    private getAnchorStart;
}
export default DataItem;
