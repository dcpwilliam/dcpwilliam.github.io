#!/bin/bash
# =============================================================
# EBI 循证投资 — 一键生成最新 DMG 安装文件
# 用法: bash build-dmg.sh [--skip-icon] [--only-x64] [--only-arm64]
# =============================================================

set -e

# --- 颜色输出 ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo "${CYAN}⚡ EBI 循证投资 — DMG 构建脚本${NC}"
echo "${CYAN}========================================${NC}"
echo ""

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# --- 解析参数 ---
SKIP_ICON=false
ARCH_TARGET=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-icon)    SKIP_ICON=true; shift ;;
    --only-x64)     ARCH_TARGET="x64"; shift ;;
    --only-arm64)   ARCH_TARGET="arm64"; shift ;;
    *)              echo "未知参数: $1"; exit 1 ;;
  esac
done

# --- [Step 1] 检查环境 ---
echo "${BLUE}[1/6] 检查构建环境...${NC}"

# Node.js
if ! command -v node &> /dev/null; then
  echo "${RED}  ❌ Node.js 未安装，请先安装 Node.js 18+${NC}"
  echo "     https://nodejs.org/${NC}"
  exit 1
fi
NODE_VERSION=$(node --version | sed 's/v//' | cut -d. -f1)
echo "  ✅ Node.js $(node --version)"

# Python（用于图标生成）
if ! command -v python3 &> /dev/null; then
  echo "${YELLOW}  ⚠️  Python3 未安装，图标生成步骤将跳过${NC}"
  SKIP_ICON=true
fi

# --- [Step 2] 生成应用图标 ---
if [ "$SKIP_ICON" = false ]; then
  echo ""
  echo "${BLUE}[2/6] 生成应用图标...${NC}"

  ICONSET_DIR="src/assets/icons/icon.iconset"
  ICNS_FILE="src/assets/icons/icon.icns"
  ICON_SVG="src/assets/icons/icon.svg"

  # 检查是否需要重新生成图标
  NEED_REGEN=false
  if [ ! -f "$ICNS_FILE" ]; then
    NEED_REGEN=true
  elif [ "$ICON_SVG" -nt "$ICNS_FILE" ]; then
    NEED_REGEN=true
  fi

  if [ "$NEED_REGEN" = true ]; then
    echo "  🎨 从 SVG 生成多尺寸 PNG 图标..."

    mkdir -p "$ICONSET_DIR"

    # 尝试使用 Node.js + sharp
    SHARP_AVAILABLE=false
    if [ -d "/Users/williamleon/.workbuddy/binaries/node/workspace/node_modules/sharp" ]; then
      SHARP_AVAILABLE=true
    elif command -v npx &> /dev/null; then
      # 检查项目本地是否有 sharp
      if [ -d "node_modules/sharp" ]; then
        SHARP_AVAILABLE=true
      fi
    fi

    if [ "$SHARP_AVAILABLE" = true ]; then
      echo "  使用 sharp (Node.js) 生成图标..."
      NODE_PATH="${PROJECT_DIR}/node_modules:/Users/williamleon/.workbuddy/binaries/node/workspace/node_modules"
      node -e "
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const svg = fs.readFileSync('${ICON_SVG}');
const dir = '${ICONSET_DIR}';
const sizes = {
  16: ['icon_16x16.png'],
  32: ['icon_16x16@2x.png', 'icon_32x32.png'],
  64: ['icon_32x32@2x.png'],
  128: ['icon_128x128.png'],
  256: ['icon_128x128@2x.png', 'icon_256x256.png'],
  512: ['icon_256x256@2x.png', 'icon_512x512.png'],
  1024: ['icon_512x512@2x.png']
};
async function run() {
  for (const [s, names] of Object.entries(sizes)) {
    for (const n of names) {
      await sharp(svg, {density: 300}).resize(+s,+s).png().toFile(path.join(dir,n));
    }
  }
  await sharp(svg, {density: 300}).resize(512,512).png().toFile('src/assets/icons/icon.png');
  console.log('Icons generated via sharp');
}
run().catch(e => {console.error(e); process.exit(1)});
" || {
        echo "${YELLOW}  ⚠️  sharp 生成失败，尝试 sips...${NC}"
        SHARP_AVAILABLE=false
      }
    fi

    if [ "$SHARP_AVAILABLE" = false ]; then
      # Fallback: 使用 macOS sips 从 SVG 的 qlmanage 渲染转换
      echo "  使用 macOS qlmanage + sips 生成图标..."

      # 先用 qlmanage 把 SVG 渲染成大 PNG
      qlmanage -t -s 1024 -o "$ICONSET_DIR" "$ICON_SVG" 2>/dev/null || true

      # qlmanage 可能生成 icon.svg.png
      RENDERED_PNG=$(find "$ICONSET_DIR" -name "*.png" -maxdepth 1 | head -1)

      if [ -z "$RENDERED_PNG" ]; then
        # 最终 fallback: 直接用 sips（不支持 SVG，但如果我们有预生成的 PNG）
        if [ -f "src/assets/icons/icon.png" ]; then
          RENDERED_PNG="src/assets/icons/icon.png"
        else
          echo "${RED}  ❌ 无法生成图标，请手动放置 icon.icns 到 src/assets/icons/${NC}"
          exit 1
        fi
      fi

      # 从大图生成各尺寸
      cp "$RENDERED_PNG" "$ICONSET_DIR/icon_512x512@2x.png"
      sips -z 16 16     "$RENDERED_PNG" --out "$ICONSET_DIR/icon_16x16.png"       -s format png &>/dev/null
      sips -z 32 32     "$RENDERED_PNG" --out "$ICONSET_DIR/icon_16x16@2x.png"    -s format png &>/dev/null
      sips -z 32 32     "$RENDERED_PNG" --out "$ICONSET_DIR/icon_32x32.png"        -s format png &>/dev/null
      sips -z 64 64     "$RENDERED_PNG" --out "$ICONSET_DIR/icon_32x32@2x.png"     -s format png &>/dev/null
      sips -z 128 128   "$RENDERED_PNG" --out "$ICONSET_DIR/icon_128x128.png"      -s format png &>/dev/null
      sips -z 256 256   "$RENDERED_PNG" --out "$ICONSET_DIR/icon_128x128@2x.png"   -s format png &>/dev/null
      sips -z 256 256   "$RENDERED_PNG" --out "$ICONSET_DIR/icon_256x256.png"       -s format png &>/dev/null
      sips -z 512 512   "$RENDERED_PNG" --out "$ICONSET_DIR/icon_256x256@2x.png"   -s format png &>/dev/null
      sips -z 512 512   "$RENDERED_PNG" --out "$ICONSET_DIR/icon_512x512.png"       -s format png &>/dev/null
      sips -z 512 512   "$RENDERED_PNG" --out "src/assets/icons/icon.png"           -s format png &>/dev/null
      echo "  Icons generated via sips"
    fi

    # iconset → icns (macOS 原生工具)
    iconutil -c icns "$ICONSET_DIR" -o "$ICNS_FILE"
    echo "  ✅ icon.icns 已生成 ($(du -k "$ICNS_FILE" | cut -f1)KB)"
  else
    echo "  ✅ icon.icns 已存在，无需重新生成"
  fi
else
  echo ""
  echo "${YELLOW}[2/6] 跳过图标生成 (--skip-icon)${NC}"
fi

# --- [Step 3] 安装 npm 依赖 ---
echo ""
echo "${BLUE}[3/6] 安装构建依赖...${NC}"

if [ ! -d "node_modules" ]; then
  echo "  运行 npm install..."
  npm install
else
  # 检查是否需要更新
  PKG_COUNT=$(ls node_modules/.package-lock.json 2>/dev/null && echo "exists" || echo "missing")
  if [ "$PKG_COUNT" = "missing" ]; then
    echo "  运行 npm install..."
    npm install
  else
    echo "  ✅ 依赖已安装"
  fi
fi

# 验证关键依赖
if [ ! -d "node_modules/electron" ]; then
  echo "${RED}  ❌ electron 未安装${NC}"
  exit 1
fi
if [ ! -d "node_modules/electron-builder" ]; then
  echo "${RED}  ❌ electron-builder 未安装${NC}"
  exit 1
fi
echo "  ✅ electron + electron-builder 已就绪"

# --- [Step 4] 版本号处理 ---
echo ""
echo "${BLUE}[4/6] 读取版本信息...${NC}"

VERSION=$(node -e "console.log(require('./package.json').version)")
PRODUCT_NAME=$(node -e "console.log(require('./package.json').build.productName)")
APP_ID=$(node -e "console.log(require('./package.json').build.appId)")

echo "  版本:    ${GREEN}${VERSION}${NC}"
echo "  产品名:  ${GREEN}${PRODUCT_NAME}${NC}"
echo "  App ID:  ${GREEN}${APP_ID}${NC}"

# --- [Step 5] 执行构建 ---
echo ""
echo "${BLUE}[5/6] 执行 electron-builder 构建...${NC}"

# 设置架构参数
BUILD_ARGS="--mac"
if [ -n "$ARCH_TARGET" ]; then
  BUILD_ARGS="--mac --arch $ARCH_TARGET"
fi

echo "  构建参数: ${BUILD_ARGS}"

# 清理旧的构建产物
if [ -d "dist" ]; then
  echo "  清理旧构建产物..."
  rm -rf dist/mac* dist/*.dmg dist/*.zip dist/builder-effective-config.yaml 2>/dev/null || true
fi

# 执行构建
npx electron-builder $BUILD_ARGS 2>&1 | while IFS= read -r line; do
  echo "  $line"
done

# --- [Step 6] 验证和汇总 ---
echo ""
echo "${BLUE}[6/6] 验证构建产物...${NC}"

DIST_DIR="dist"
DMG_FILES=$(find "$DIST_DIR" -name "*.dmg" -maxdepth 1 2>/dev/null)

if [ -z "$DMG_FILES" ]; then
  echo "${RED}  ❌ 未找到 DMG 文件！构建可能失败${NC}"
  echo "  检查 dist 目录内容:"
  ls -la "$DIST_DIR" 2>/dev/null || echo "  dist 目录不存在"
  exit 1
fi

echo ""
echo "${GREEN}========================================${NC}"
echo "${GREEN}  ✅ 构建成功！${NC}"
echo "${GREEN}========================================${NC}"
echo ""

for dmg in $DMG_FILES; do
  DMG_SIZE=$(du -h "$dmg" | cut -f1)
  DMG_NAME=$(basename "$dmg")
  echo "  ${CYAN}📦 ${DMG_NAME}${NC}  (${DMG_SIZE})"
  echo "     路径: ${dmg}"
  echo ""
done

# 同时检查是否有 zip
ZIP_FILES=$(find "$DIST_DIR" -name "*.zip" -maxdepth 1 2>/dev/null)
for zip in $ZIP_FILES; do
  ZIP_SIZE=$(du -h "$zip" | cut -f1)
  ZIP_NAME=$(basename "$zip")
  echo "  ${CYAN}📁 ${ZIP_NAME}${NC}  (${ZIP_SIZE})"
  echo "     路径: ${zip}"
  echo ""
done

echo "${YELLOW}  💡 使用方式:${NC}"
echo "     双击 DMG → 拖拽到 Applications → 打开 EBI 循证投资"
echo "     或运行: open dist/*.dmg"
echo ""
echo "${YELLOW}  💡 开发调试:${NC}"
echo "     npm run electron          # 开发模式"
echo "     npm run electron -- --dev # 连接 localhost:8080"
echo ""

# --- 可选：自动打开 DMG ---
if [[ "${CP_AUTO_OPEN:-}" == "true" ]]; then
  echo "  自动打开 DMG..."
  FIRST_DMG=$(find "$DIST_DIR" -name "*.dmg" -maxdepth 1 | head -1)
  open "$FIRST_DMG"
fi

echo "${GREEN}构建完成！${NC} 🚀"