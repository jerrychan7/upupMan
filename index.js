
const SIZE_TYPE = {
  FACEBOOK_COVER: "facebook_cover",
  SQUARE: "square",
  AUTO_SIZE: "auto_size",
  AUTO_SQUARE: "auto_square",
  CUSTOM: "custom",
  IS_AUTO: type => type === SIZE_TYPE.AUTO_SIZE || type === SIZE_TYPE.AUTO_SQUARE,
};
Object.freeze(SIZE_TYPE);

const imgW = 102, imgH = 199, imgCount = 33;

const loadFont = async ({ family, src, ...descriptors } = {}) => {
  let font = new FontFace(family, src, descriptors);
  document.fonts.add(font);
  await font.load();
  return font;
};
const loadImg = (url, x, y) => new Promise((res, rej) => {
  let img = new Image(x, y);
  img.onload = () => res(img);
  img.onerror = err => rej(err);
  img.src = url;
});
// [min, max)
const getRandInt = (min = 1, max = imgCount) => ~~(Math.random() * (max - min) + min);
const deg2rad = deg => deg * Math.PI / 180;
const rad2deg = rad => rad * 180 / Math.PI;

class UpupMan {
  imgs = [];
  bgColor = "transparent";
  fgColor = "#FFF100";
  get defaultDim() {
    return {
      // for text
      scaleX: 1.3, scaleY: 1,
      skewH: .635, skewV: -1.5,
      moveX: 35.5, moveY: 41.1,
      fontSizeZh: 26,
      fontSizeEn: 32,

      offsetX: 500, offsetY: 300,
      gapX: -48, gapY: -146,
      rotate: deg2rad(-23.5),
      shear: -.585,
      zoom: 1,

      defaultFontColor: "#40210f",
    };
  };
  dimensions = this.defaultDim;
  sizeType = SIZE_TYPE.AUTO_SIZE;
  size = { width: 100, height: 100 };
  words = [];
  constructor(canvas = document.createElement("canvas")) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
  };
  setForegroundColor(color = "#FFF100") {
    this.fgColor = color;
    this.render();
  };
  setBackgroundColor(color = "transparent") {
    this.bgColor = color;
    this.render();
  };
  setSize(type, width = 100, height = 100) {
    this.sizeType = type;
    if (type === SIZE_TYPE.FACEBOOK_COVER)
      width = 850, height = 315;
    else if (type === SIZE_TYPE.SQUARE)
      width = height = 500;
    this.size = { width, height };
    this.render();
  };
  updateDim(obj = this.dimensions) {
    for (let k in obj)
      if (k in this.dimensions)
        this.dimensions[k] = obj[k];
    this.render();
  };
  reGenImg() {
    for (let line of this.words) {
      for (let info of line) {
        info.img = info.ch === " "? this.imgs[0]: this.randImg();
      }
    }
    this.render();
  };
  processWords(text = "") {
    const { words } = this;
    text = text.toLocaleUpperCase();
    const lines = text.split("\n");
    let numOfLine = lines.length;
    words.length = numOfLine;
    for (let lineIdx = 0; lineIdx < numOfLine; ++lineIdx) {
      const line = lines[lineIdx];
      words[lineIdx] = words[lineIdx] || [];
      words[lineIdx].length = line.length;
      for (let chIdx = 0; chIdx < line.length; ++chIdx) {
        const ch = line[chIdx];
        if (ch === words[lineIdx][chIdx]?.ch) continue;
        words[lineIdx][chIdx] = {
          ch,
          img: ch === " "? this.imgs[0]: this.randImg(),
          color: ({
            "♥": "#ca2626",
            "❤": "#d92b6d",
          })[ch] || this.dimensions.defaultFontColor,
        };
      }
    }
    this.render();
  };
  getImgPos = (lineIdx, chIdx, offsetX = this.dimensions.offsetX, offsetY = this.dimensions.offsetY) => {
    const { gapY, gapX, shear, rotate } = this.dimensions;
    // console.log(offsetX, offsetY);
    let y = lineIdx * (imgH + gapY),
        x = chIdx * (imgW + gapX) + shear * y,
        s = Math.sin(rotate),
        c = Math.cos(rotate),
        py = (y * c - x * s) + offsetY,
        px = (y * s + x * c) + offsetX;
    return [~~px, ~~py];
  };
  echoSize(w, h) {
    [...document.getElementsByClassName("squareSizeEcho")].forEach(e => e.innerHTML = Math.max(w, h));
    document.getElementById("autoSizeEchoW").innerHTML = w;
    document.getElementById("autoSizeEchoH").innerHTML = h;
  };
  calcSize() {
    const { words, getImgPos, dimensions } = this;
    let minX = 50, maxX, minY = 50, maxY, w = 100, h = 100;
    if (words.length !== 0) {
      minX = minY = Number.MAX_VALUE;
      maxX = maxY = Number.MIN_VALUE;
      let zeroCount = 0;
      words.forEach((line, i) => {
        zeroCount += line.length === 0;
        line.forEach((info, j) => {
          let [x, y] = getImgPos(i, j, 0, 0);
          // console.log(info.ch, i, j, x, y)
          if (minX > x) minX = x;
          if (maxX < x) maxX = x;
          if (minY > y) minY = y;
          if (maxY < y) maxY = y;
        });
      });
      if (zeroCount !== words.length) {
        w = maxX - minX + imgW;
        h = maxY - minY + imgH;
      }
      // console.log({minX, maxX, minY, maxY, w, h, zeroCount})
    }
    w = Math.ceil(w * dimensions.zoom);
    h = Math.ceil(h * dimensions.zoom);
    return {w, h, minX, minY};
  };
  calcSizeAndEcho() {
    let {w, h, minX, minY} = this.calcSize();
    this.echoSize(w, h);
    return {w, h, minX, minY};
  };
  calcOffsetAndSize({w, h, minX, minY} = this.calcSize(), sizeType = this.sizeType) {
    minY = Math.max(0, Math.abs(minY));
    minX = Math.max(0, Math.abs(minX));
    const isAutoSize = SIZE_TYPE.IS_AUTO(sizeType);
    const ans = {
      offsetY: this.dimensions.offsetY,
      offsetX: this.dimensions.offsetX,
      width: this.size.width,
      height: this.size.height,
      isAutoSize,
    };
    if (isAutoSize) {
      [ans.offsetY, ans.offsetX, ans.width, ans.height] = [minY, minX, w, h];
      if (sizeType === SIZE_TYPE.AUTO_SQUARE) {
        ans.width = ans.height = Math.max(w, h);
        if (w > h) ans.offsetY += (w - h) / 2 / this.dimensions.zoom;
        else ans.offsetX += (h - w) / 2 / this.dimensions.zoom;
      }
    }
    return ans;
  };
  updateOffsetAndSize({offsetX, offsetY, width, height} = this.calcOffsetAndSize()) {
    this.dimensions.offsetX = offsetX;
    this.dimensions.offsetY = offsetY;
    this.size.width = width;
    this.size.height = height;
  };
  render() {
    const { canvas, ctx, fgColor, bgColor, words, dimensions, size, getImgPos } = this;

    this.updateOffsetAndSize(this.calcOffsetAndSize(this.calcSizeAndEcho()));

    canvas.width = Math.ceil(size.width);
    canvas.height = Math.ceil(size.height);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dimensions.zoom, 0, 0, dimensions.zoom, 0, 0);

    const fgHelper = document.createElement("canvas"), fgHelperCtx = fgHelper.getContext("2d");
    fgHelper.width = imgW; fgHelper.height = imgH;
    fgHelperCtx.drawImage(this.imgs.mask, 0, 0);
    fgHelperCtx.globalCompositeOperation = "source-in";
    fgHelperCtx.fillStyle = fgColor;
    fgHelperCtx.fillRect(0, 0, imgW, imgH);

    const zhFont = "900 " + dimensions.fontSizeZh + "px 'LiHei Pro','微軟正黑體','Microsoft JhengHei'";
    const enFont = "bold " + dimensions.fontSizeEn + "px 'Conv_ITC Avant Garde Gothic LT Bold','Arial Black', 'Arial'";

    // draw img
    words.forEach((line, i) => {
      line.forEach(({ ch, img, color }, j) => {
        if (ch === " ") return;

        // p' = p * shear * rotate * offset * zoom
        // 其中 zoom 由 ctx 的矩阵完成
        const [px, py] = getImgPos(i, j);
        ctx.drawImage(fgHelper, px, py);
        ctx.drawImage(img, px, py);

        // draw character
        ctx.save();
        ctx.fillStyle = color;
        ctx.textAlign = "center";
        // [^a-zA-Z\d-_.!~*'()]
        ctx.font = encodeURIComponent(ch).length > 1? zhFont: enFont;
        ctx.imageSmoothingEnabled = false;
        ctx.setTransform(dimensions.zoom, 0, 0, dimensions.zoom, 0, 0);
        ctx.translate(px, py);
        ctx.transform(
          dimensions.scaleX, dimensions.skewH, dimensions.skewV,
          dimensions.scaleY, dimensions.moveX, dimensions.moveY
        );
        ctx.rotate(deg2rad(-3));
        ctx.fillText(ch, 0, 0);
        ctx.restore();
      });
    });
  };
  randImg() {
    return this.imgs[getRandInt()];
  };
  preloadFont() {
    return loadFont({
      family: "Conv_ITC Avant Garde Gothic LT Bold",
      src: "local('☺'), url('fonts/ITC Avant Garde Gothic LT Bold.woff2') format('woff2'), url('fonts/ITC Avant Garde Gothic LT Bold.woff') format('woff'), url('fonts/ITC Avant Garde Gothic LT Bold.ttf') format('truetype'), url('fonts/ITC Avant Garde Gothic LT Bold.svg') format('svg')",
      weight: "normal",
      style: "normal",
    });
  };
  async preloadImgs() {
    const xy2i = (x, y) => ((y * imgW) + x) * 4, i2xy = i => [(i >> 2) % imgW, (i >> 2) / imgW |0];
    let promises = [loadImg("materials/sprites.webp", imgW * imgCount, imgH)];
    const spritesImg = await promises[0];
    const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d");
    canvas.width = imgW;
    canvas.height = imgH;
    const maskData = ctx.getImageData(0, 0, imgW, imgH), maskArr = maskData.data;
    for (let i = 0; i < maskArr.length; i += 4)
      maskArr[i] = maskArr[i + 1] = maskArr[i + 2] = maskArr[i + 3] = 0;
    for (let i = 0; i < imgCount; ++i) {
      ctx.clearRect(0, 0, imgW, imgH);
      ctx.drawImage(spritesImg, i * imgW, 0, imgW, imgH, 0, 0, imgW, imgH);
      // i == 0 是一张透明图片 不用处理
      if (i) {
        let imgData = ctx.getImageData(0, 0, imgW, imgH), imgArr = imgData.data;
        // 50, 30 大概在告示牌中间
        let queue = [[50, 30]];
        while (queue.length) {
          const [x, y] = queue.shift();
          if (x < 0 || y < 0 || x >= imgW || y >= imgH) continue;
          // 获取rgb转为hsv后的v分量的值。由于hsv的v分量比hsl的l分量的计算量小，故用hsv
          const i = xy2i(x, y), v = Math.max(imgArr[i], imgArr[i + 1], imgArr[i + 2]) / 255;
          // 告示牌中间的黄色是亮色 而边框是暗的 0.26刚好可以划分开来 同时v分量取反刚好可以近似下用于透明度
          if (v < .26) continue;
          queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
          // 边框颜色 #40210F
          imgArr[i + 0] = 0x40; imgArr[i + 1] = 0x21; imgArr[i + 2] = 0x0F;
          imgArr[i + 3] = (1 - v) * 255;
          maskArr[i + 3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);
      }
      promises.push(loadImg(canvas.toDataURL(), imgW, imgH).then(img => this.imgs[i] = img));
    }
    const maskCanvas = document.createElement("canvas"), maskCtx = maskCanvas.getContext("2d");
    maskCanvas.width = imgW; maskCanvas.height = imgH;
    maskCtx.putImageData(maskData, 0, 0);
    promises.push(loadImg(maskCanvas.toDataURL(), imgW, imgH).then(img => this.imgs.mask = img));
    return Promise.allSettled(promises);
  };
  preloadRes() {
    return Promise.allSettled([this.preloadFont(), this.preloadImgs()]);
  };
}

function setLang(lang) {
  let i = {
      "en": {
        title: "UPUP to You",
        info: `Materials and copyright belong to <a href="https://www.haniboi.com/">Haniboi</a>. The <a href="http://upuptoyou.com/">original web page</a> is no longer valid, this project provides more customization options.`,
        your_message_here: "YOUR MESSAGE HERE",
        background_colors: "BACKGROUND COLORS",
        facebook_cover: "FACEBOOK COVER",
        square: "SQUARE",
        choose_your_team: "CHOOSE YOUR TEAM",
        download_this_pic: "DOWNLOAD THIS PIC",
        size: "SIZE",
        style: "STYLE",
        auto_square: "AUTO SQUARE",
        auto_size: "AUTO",
        custom_size: "CUSTOM",
        custom_bg_color: "CUSTOM: ",
        custom_fg_color: "CUSTOM: ",
        adv_settings: "ADVANCED SETTINGS",
        layout: "LAYOUT",
        preset: "Preset:",
        preset_fb_cover: "fb cover",
        preset_square: "square",
        preset_compact: "compact",
        foreground_colors: "FOREGROUND COLORS",
        msg_placeholder: "Write a message... lay it out with spaces, and newlines!",
      },
      "zh-CN": {
        title: "UPUP 举牌加油小人生成器",
        info: `素材和版权归都于 <a href="https://www.haniboi.com/">Haniboi</a>。<a href="http://upuptoyou.com/">原网址</a>已失效，本项目提供更多的自定义选项。`,
        your_message_here: "写些想说的话",
        background_colors: "背景颜色",
        custom_bg_color: "自定义",
        facebook_cover: "Facebook 封面",
        square: "方形",
        download_this_pic: "下载图片",
        size: "大小",
        style: "样式",
        auto_square: "自动（方形）",
        auto_size: "自动",
        custom_size: "自定义",
        custom_bg_color: "自定义：",
        custom_fg_color: "自定义：",
        adv_settings: "高级设置",
        layout: "布局",
        preset: "预设：",
        preset_fb_cover: "脸书封面",
        preset_square: "正方形",
        preset_compact: "紧凑",
        foreground_colors: "前景色",
        msg_placeholder: "写些想说的话……用空格、换行来布局！",
      },
      "zh-TW": {
        title: "UPUP 舉牌加油小人產生器",
        info: `素材和版權歸都於 <a href="https://www.haniboi.com/">Haniboi</a>。 <a href="http://upuptoyou.com/">原網址</a>已失效，本項目提供更多的客制化選項。`,
        your_message_here: "寫些想說的話",
        background_colors: "背景顏色",
        facebook_cover: "臉書封面",
        square: "方形",
        download_this_pic: "下載圖片",
        size: "大小",
        style: "樣式",
        auto_square: "自動（方形）",
        auto_size: "自動",
        custom_size: "自定義",
        custom_bg_color: "自定義：",
        custom_fg_color: "自定義：",
        adv_settings: "高級設置",
        layout: "佈局",
        preset: "預設：",
        preset_fb_cover: "臉書封面",
        preset_square: "正方形",
        preset_compact: "緊凑",
        foreground_colors: "前景色",
        msg_placeholder: "寫些想說的話……用空白、斷行排列小人！",
      },
      "ja": {
        title: "UPUP 応援サインジェネレーター",
        info: `素材および著作権は<a href="https://www.haniboi.com/">Haniboi</a>に帰属します。 <a href="http://upuptoyou.com/">元の Web ページ</a>は有効ではなくなりました。このプロジェクトは、より多くのカスタマイズ オプションを提供します。`,
        your_message_here: "何か書く",
        background_colors: "背景色",
        facebook_cover: "フェイスブックカバー",
        square: "四角形",
        download_this_pic: "下載圖片",
        size: "サイズ",
        style: "様式",
        auto_square: "自動（角型）",
        auto_size: "自動",
        custom_size: "カスタマイズ",
        custom_bg_color: "カスタマイズ：",
        custom_fg_color: "カスタマイズ：",
        adv_settings: "高度な設定",
        layout: "レイアウト",
        preset: "プリセット：",
        preset_fb_cover: "Facebookのカバー",
        preset_square: "角型",
        preset_compact: "コンパクト",
        foreground_colors: "前景色",
        msg_placeholder: "言いたいことを書いて… 空白と改行で組版！",
      }
  };
  document.querySelectorAll("[data-lang]").forEach(ele => {
    if (ele.nodeName === "TEXTAREA")
      ele.placeholder = i[lang][ele.dataset.lang];
    else
      ele.innerHTML = i[lang][ele.dataset.lang];
  });
}

window.onload = async () => {
  const upupMan = new UpupMan(document.querySelector("canvas"));
  document.querySelectorAll(".sect-bg-color [data-color]").forEach(a => {
    const { color } = a.dataset;
    a.style.setProperty("--bg-color", color === "transparent"? "#FFF": color);
    a.addEventListener("click", () => {
      upupMan.setBackgroundColor(color);
    });
  });
  document.querySelector(".sect-bg-color input[type=color].color-block").addEventListener("click", e => {
    upupMan.setBackgroundColor(e.target.value);
  })
  document.querySelector(".sect-bg-color input[type=color].color-block").addEventListener("input", e => {
    upupMan.setBackgroundColor(e.target.value);
  });
  document.getElementById("btn-refresh").addEventListener("click", e => {
    upupMan.reGenImg();
  });
  document.querySelectorAll("input[type=range]").forEach((input, i) => {
    let id = input.id;
    let span = input.parentElement.nextElementSibling.firstElementChild;
    span.innerHTML = input.value = upupMan.dimensions[id] * (id === "rotate"? 180 / Math.PI: 1);
    input.addEventListener("input", () => {
      upupMan.updateDim({ [id]: input.value * (id === "rotate"? Math.PI / 180: 1) });
      span.innerHTML = (+input.value).toFixed(3);
    });
  });
  document.getElementById("lang-selector").addEventListener("change", e => {
    setLang(e.target.value);
  });
  document.getElementById("words").addEventListener("input", e => {
    upupMan.processWords(e.target.value);
  });
  document.querySelectorAll("[data-size]").forEach(ele => {
    ele.querySelector("input[type=radio]").addEventListener("change", e => {
      if (ele.dataset.size === SIZE_TYPE.CUSTOM)
        upupMan.setSize(SIZE_TYPE.CUSTOM, +document.getElementById("sizeW").value, +document.getElementById("sizeH").value);
      else
        upupMan.setSize(ele.dataset.size);
      document.querySelectorAll("input[id^=offset]").forEach(input => {
        input.title = (input.disabled = SIZE_TYPE.IS_AUTO(ele.dataset.size))
          ? "Cannot change at auto size or auto square size"
          : "";
      });
    });
  });
  document.getElementById("btn-download").addEventListener("click", e => {
    let url = upupMan.canvas.toDataURL("image/png");
    if (!navigator.userAgent.match(/(iPad|Android|iPhone|iPod)/g))
      url = url.replace("image/png", "image/octet-stream");
    e.target.href = url;
  });
  document.getElementById("btn-insert-space").addEventListener("click", () => {
    const textarea = document.getElementById("words");
    const [start, end] = [textarea.selectionStart, textarea.selectionEnd];
    textarea.setRangeText(" ", start, end, start === end? "end": "select");
    upupMan.processWords(textarea.value);
  });
  document.querySelectorAll(".sect-fg-color [data-color]").forEach(a => {
    const { color } = a.dataset;
    a.style.setProperty("--bg-color", color === "transparent"? "#FFF": color);
    a.addEventListener("click", () => {
      upupMan.setForegroundColor(color);
    });
  });
  document.querySelector(".sect-fg-color input[type=color].color-block").addEventListener("click", e => {
    upupMan.setForegroundColor(e.target.value);
  })
  document.querySelector(".sect-fg-color input[type=color].color-block").addEventListener("input", e => {
    upupMan.setForegroundColor(e.target.value);
  });

  const fbDimInfo = { gapX: -25.594502815569612, gapY: -128, offsetX: 422.73333333333335, offsetY: -6.7457627118644075, rotate: -0.36397895650964407, shear: -0.65, zoom: 0.8859000886786875, };
  const sqDimInfo = { gapX: -28.686156371459916, gapY: -126.4, offsetX: 228.1578947368421, offsetY: 82.80536912751677, rotate: -0.41450687458478597, shear: -0.615, zoom: 0.7469208789043256, };
  /*
    上面的魔法数字的由来
    原版的有两个预设：脸书封面，以及正方形
    这两个预设采用的参数：
      脸书封面：start = { x: 310, y: -30 }, image = { gapX: 63, gapY: 24, w: 90, h: 177 }, linebreak = { x: -60, y: 44 };
      正方形：start = { x: 120, y: 40 }, image = { gapX: 50, gapY: 22, w: 76, h: 149 }, linebreak = { x: -52, y: 36 };
    基于公式直接算出画布上的坐标：
      x = (startX + linebreakX * lineIdx) + gapX * (charIdx + 1);
      y = (startY + linebreakY * lineIdx) + gapY * (charIdx + 1);
      ctx.drawImage(img, x, y, image.w, image.h);
    算了半天，原版的坐标系统和本项目中实现的坐标系统不存在转换公式
    部分转换关系：
      const zoomX = image.w / imgW, zoomY = image.h / imgH, zoom = (zoomX + zoomY) / 2;
      const offsetX = (start.x + image.gapX) / zoomX, offsetY = (start.y + image.gapY) / zoomY;
      const xtan = Math.atan(image.gapY / image.gapX), rotate = -xtan;
      const gapX = (image.gapX / Math.cos(xtan)) / zoomX - imgW;
      // 悟了 这两坐标系统就没有等价转换式 直接手动上近似值得了
      const gapY = -128, shear = -.65;  // 脸书封面
      const gapY = -126.4, shear = -.615;   // 正方形
  */
  document.querySelectorAll("[data-preset]").forEach(ele => {
    ele.addEventListener("click", e => {
      upupMan.updateDim({
        "compact": {
          ...upupMan.defaultDim,
          offsetX: upupMan.dimensions.offsetX,
          offsetY: upupMan.dimensions.offsetY,
        },
        "fb": fbDimInfo,
        "square": sqDimInfo,
      }[ele.dataset.preset]);
      document.querySelectorAll("input[type=range]").forEach((input) => {
        input.parentElement.nextElementSibling.firstElementChild.innerHTML = (input.value = upupMan.dimensions[input.id] * (input.id === "rotate"? 180 / Math.PI: 1)).toFixed(3);
      });
    });
  });
  for (let id of ["sizeW", "sizeH"])
    document.getElementById(id).addEventListener("input", e => {
      if (upupMan.sizeType !== SIZE_TYPE.CUSTOM || Number.isNaN(+e.target.value))
        return;
      upupMan.setSize(SIZE_TYPE.CUSTOM, +document.getElementById("sizeW").value, +document.getElementById("sizeH").value);
    });
  document.querySelectorAll(".sect-style button").forEach(btn => {
    btn.addEventListener("click", e => {
      document.querySelector(`[data-size='${btn.dataset.lang}'`).click();
      if (btn.dataset.lang === "facebook_cover")
        document.querySelector("[data-preset='fb']").click();
      else document.querySelector("[data-preset='square']").click();
    });
  });
  const toggleTri = (details, tri) =>
    tri.forEach(details.open? t => {
      t.classList.remove("left", "right");
      t.classList.add("down");
    }: (t, i) => {
      t.classList.remove("down");
      t.classList.add(["right", "left"][i]);
    });
  document.querySelectorAll("summary").forEach(summary => {
    let tri = summary.querySelectorAll(".pui-icon.triangle");
    if (tri.length === 0) return;
    const details = summary.parentElement;
    toggleTri(details, tri);
    details.addEventListener("toggle", () => toggleTri(details, tri));
  });
  await upupMan.preloadRes();
  document.querySelector(".sect-style button[data-lang='auto_size']").click();
  upupMan.processWords("work\nhard\nplay\nharder!");

//   window.upupMan = upupMan;
//   upupMan.setSize("custom", 500, 500);
//   document.querySelector("[data-preset=square]").click();
//   upupMan.processWords(document.getElementById("words").value = `abc
// def
// ghi`);

//   upupMan.processWords(document.getElementById("words").value = `abcdefghijklmnopqrstuvwxyz
// ♥❤|_abcdefghijklmnopqrstuv
// 干饭 不积极abcdefghijklmnopqrst
// 思想 有问题abcdefghijklmnopqrst
// abcdefghijklmnopqrstuvwxyz
// abcdefghijklmnopqrstuvwxyz
// abcdefghijklmnopqrstuvwxyz
// abcdefghijklmnopqrstuvwxyz
// abcdefghijklmnopqrstuvwxyz
// abcdefghijklmnopqrstuvwxyz
// abcdefghijklmnopqrstuvwxyz
// abcdefghijklmnopqrstuvwxyz
// abcdefghijklmnopqrstuvwxyz
// abcdefghijklmnopqrstuvwxyz
// abcdefghijklmnopqrstuvwxyz
// abcdefghijklmnopqrstuvwxyz
// abcdefghijklmnopqrstuvwxyz
// abcdefghijklmnopqrstuvwxyz`);
//   upupMan.processWords(document.getElementById("words").value =
// `       
//           
//        

//        
//        
//        
//        
//        
//      
//          
//          
//          
//      `);
};
