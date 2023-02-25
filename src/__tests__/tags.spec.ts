import { deserializeTags, serializeTags, tagsExportForTesting } from "../tags";

import { Type } from "avsc";
import { randomBytes, randomInt } from "crypto";

const tagParser = Type.forSchema({
  type: "record",
  name: "Tag",
  fields: [
    { name: "name", type: "string" },
    { name: "value", type: "string" },
  ],
});

const tagsParser = Type.forSchema({
  type: "array",
  items: tagParser,
});

function serializeTagsAVSC(
  tags: { name: string; value: string; }[],
): Uint8Array {
  if (tags!.length == 0) {
    return new Uint8Array(0);
  }

  let tagsBuffer;
  try {
    tagsBuffer = tagsParser.toBuffer(tags);
  } catch (e) {
    throw new Error(
      "Incorrect tag format used. Make sure your tags are { name: string!, value: string! }[]",
    );
  }

  return Uint8Array.from(tagsBuffer);
}

export function generateRandomTags(
  tagsCount = randomInt(1, 100),
  maxChars = 1000,
) {
  return new Array(tagsCount).fill(undefined).map(() => {
    return {
      name: randomBytes(randomInt(1, maxChars)).toString("hex"),
      value: randomBytes(randomInt(1, maxChars)).toString("hex"),
    };
  });
}

const sTags = [{ name: "ThisIsAShortName", value: "ThisIsAShortValue" }];
const lTags = [
  {
    name: "ThisIsALongNameAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    value:
      "ThisIsALongValueAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  },
];
const sTagsEnc = Buffer.from([
  2, 32, 84, 104, 105, 115, 73, 115, 65, 83, 104, 111, 114, 116, 78, 97, 109,
  101, 34, 84, 104, 105, 115, 73, 115, 65, 83, 104, 111, 114, 116, 86, 97, 108,
  117, 101, 0,
]);
const lTagsEnc = Buffer.from([
  2, 128, 1, 84, 104, 105, 115, 73, 115, 65, 76, 111, 110, 103, 78, 97, 109,
  101, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65,
  65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65,
  65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 156, 1, 84, 104, 105, 115, 73,
  115, 65, 76, 111, 110, 103, 86, 97, 108, 117, 101, 65, 65, 65, 65, 65, 65, 65,
  65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65,
  65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65,
  65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 65, 0,
]);

describe("Tag tests", function () {
  describe("given we have tags", () => {
    it("should encode the sample tags correctly", function () {
      const parserEncodeS = serializeTags(sTags);
      expect(parserEncodeS).toEqual(sTagsEnc);
      const parserEncodeL = serializeTags(lTags);
      expect(parserEncodeL).toEqual(lTagsEnc);
    });
    it("should decode the sample tags correctly", function () {
      expect(deserializeTags(sTagsEnc)).toEqual(sTags);
      expect(deserializeTags(lTagsEnc)).toEqual(lTags);
    });
    it("should correctly encode/decode random tags", function () {
      const randomTags = generateRandomTags();
      let serializedTags = serializeTags(randomTags);
      expect(serializedTags).toEqual(Buffer.from(serializeTagsAVSC(randomTags)));
      expect(deserializeTags(serializedTags)).toEqual(randomTags);
    });
    describe("given the tags are invalid", () => {
      it("should throw an error if the tags are not in the correct format", function () {
        // @ts-expect-error
        expect(() => serializeTags([{ name: "ThisIsAShortName" }])).toThrow(
          "Incorrect tag format used. Make sure your tags are { name: string, value: string }[]",
        );
        // @ts-expect-error
        expect(() => serializeTags([{ value: "ThisIsAShortValue" }])).toThrow(
          "Incorrect tag format used. Make sure your tags are { name: string, value: string }[]",
        );
        // @ts-expect-error
        expect(() => serializeTags([{ name: "ThisIsAShortName", value: 1 }])).toThrow(
          "Incorrect tag format used. Make sure your tags are { name: string, value: string }[]",
        );
      });
    });
    describe("given we don't have tags", () => {
      it("should encode an empty array as an empty array", function () {
        expect(serializeTags([])).toEqual(Buffer.from(""));
      });
    });
    describe("given we have many many tags", () => {
      it("should encode/decode many tags", function () {
        const randomTags = generateRandomTags(1024);
        const serializedTags = serializeTags(randomTags);
        expect(serializedTags).toEqual(Buffer.from(serializeTagsAVSC(randomTags)));
        expect(deserializeTags(serializedTags)).toEqual(randomTags);
      });
    });
  });


  describe("encodeLong", () => {
    describe("given we have a long", () => {
      it("should encode a long AVSC", () => {
        const long = 123456789;
        const encoded = tagsExportForTesting.encodeLong(long);
        expect(encoded).toEqual(Buffer.from([170, 180, 222, 117]));
      });
    });
  });
});

