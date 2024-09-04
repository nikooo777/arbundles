import { verify } from "@noble/ed25519";
import { SignatureConfig, SIG_CONFIG } from "../../constants.js";
export default class InjectedAptosSigner {
    _publicKey;
    ownerLength = SIG_CONFIG[SignatureConfig.INJECTEDAPTOS].pubLength;
    signatureLength = SIG_CONFIG[SignatureConfig.INJECTEDAPTOS].sigLength;
    signatureType = SignatureConfig.INJECTEDAPTOS;
    pem;
    provider;
    constructor(provider, publicKey) {
        this.provider = provider;
        this._publicKey = publicKey;
    }
    get publicKey() {
        return this._publicKey;
    }
    /**
     * signMessage constructs a message and then signs it.
     * the format is "APTOS(\n)
     * message: <hexString>(\n)
     * nonce: bundlr"
     */
    async sign(message) {
        if (!this.provider.signMessage)
            throw new Error("Selected Wallet does not support message signing");
        const signingResponse = await this.provider.signMessage({
            message: Buffer.from(message).toString("hex"),
            nonce: "bundlr",
        });
        const signature = signingResponse.signature;
        return typeof signature === "string" ? Buffer.from(signature, "hex") : signature.data.toUint8Array();
    }
    static async verify(pk, message, signature) {
        const p = pk;
        return verify(Buffer.from(signature), Buffer.from(`APTOS\nmessage: ${Buffer.from(message).toString("hex")}\nnonce: bundlr`), // see comment above sign
        Buffer.from(p));
    }
}
//# sourceMappingURL=InjectedAptosSigner.js.map