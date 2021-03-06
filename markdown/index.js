const markdown = require("remark-parse");
const stringify = require("remark-stringify");
const strip = require("strip-markdown");
const unified = require("unified");

const remarkTags = require("./remark-tags");

const withIds = (mdast, currentKey) => {
  if (mdast.children) {
    mdast.children.forEach((child, i) => {
      const newKey = currentKey ? `${currentKey}-${i}` : `${i}`;
      child.id = newKey;
      withIds(child, newKey);
    });
  }

  return mdast;
};

const stringifyMdast = mdast => {
  return unified()
    .use(stringify, { listItemIndent: 1, fences: true })
    .use(remarkTags)
    .stringify(mdast);
};

const stringifyMdastToPlainText = mdast => {
  return unified()
    .use(stringify, { listItemIndent: 1, fences: true })
    .use(remarkTags)
    .use(strip)
    .stringify(mdast);
};

const fastStringifyMdast = mdast => {
  return mdast.children
    .filter(({ value = "" }) => !value.startsWith("\n"))
    .map(({ value, type, ...rest }) => {
      // console.log({ value, type, rest })

      switch (type) {
        case "inlinceCode":
          return `\`${value}\``;

        case "link":
        case "listItem":
        case "paragraph":
          return fastStringifyMdast({ children: rest.children });

        default:
          return value;
      }
    })
    .join("");
};

const parseMarkdown = text => {
  return withIds(
    unified()
      .use(markdown)
      .use(remarkTags)
      .parse(text)
  );
};

module.exports = {
  parseMarkdown,
  stringifyMdast,
  stringifyMdastToPlainText,
  fastStringifyMdast
};
