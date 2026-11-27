import { writeFileSync } from 'node:fs';

const [tag, stars] = process.argv.slice(2);
if (!/^v?\d+\.\d+\.\d+$/.test(tag ?? '') || !/^(0|[1-9]\d*)$/.test(stars ?? '') || !Number.isSafeInteger(Number(stars))) {
  throw new Error('Usage: node scripts/update-readme-badges.mjs <release-tag> <star-count>');
}

const version = tag.replace(/^v/, '');
const star = '<path fill="#ffdd83" d="m13 4.5 1.7 3.5 3.9.6-2.8 2.7.6 3.8-3.4-1.8-3.4 1.8.6-3.8-2.8-2.7 3.9-.6z"/>';

for (const { file, title, label, value, labelWidth, leftIcon } of [
  { file: 'version', title: `正式版 ${version}`, label: '正式版', value: version, labelWidth: 46, leftIcon: '' },
  { file: 'star-count', title: `GitHub Stars: ${stars}`, label: 'Stars', value: stars, labelWidth: 57, leftIcon: star },
]) {
  const valueWidth = Math.max(28, value.length * 8 + 12);
  const width = labelWidth + valueWidth;
  const labelCenter = (labelWidth + (leftIcon ? 18 : 0)) / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" viewBox="0 0 ${width} 20" role="img" aria-labelledby="title">
  <title id="title">${title}</title>
  <path fill="#555" d="M0 0h${labelWidth}v20H0z"/>
  <path fill="#267356" d="M${labelWidth} 0h${valueWidth}v20H${labelWidth}z"/>
  ${leftIcon ? `${leftIcon}\n  ` : ''}<g fill="#fff" font-family="Verdana,Arial,'Microsoft YaHei','PingFang SC',sans-serif" font-size="11" text-anchor="middle">
    <text x="${labelCenter}" y="14">${label}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${value}</text>
  </g>
</svg>
`;
  writeFileSync(new URL(`../docs/readme/${file}.svg`, import.meta.url), svg);
}
