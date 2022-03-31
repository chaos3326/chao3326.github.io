/**
 * change video upon clicking on buttons
 */
var currentVideo = 0;
const videos = {
    video1: document.getElementById("video1"),
    video2: document.getElementById("video2"),
    link: document.getElementById("video-link")
}
const buttons = {
    prev: document.getElementById("prev"),
    next: document.getElementById("next")
}
handleRenderVideo("./assets/videos/videos.json", 0);
buttons.prev.addEventListener("click", changeVideo);
buttons.next.addEventListener("click", changeVideo);
function renderVideo(data) {
    videos.video1.src = data.file;
    videos.video1.volume = 0.5;
    videos.link.href = data.source;
    videos.link.getElementsByTagName("span")[0].innerHTML = data.source;
}
function handleRenderVideo(dataPath, index) {
    fetch(dataPath)
        .then(response => {
            return response.json();
        })
        .then(data => {
            renderVideo(data[(index % data.length + data.length) % data.length]);
        })
}
function changeVideo(clickEvent) {
    let prev = parseInt(clickEvent.target.dataset.prev);
    currentVideo = currentVideo - prev;
    handleRenderVideo("./assets/videos/videos.json", currentVideo);
}

/**
 * Process for the canvas "video2"
 */
const ctx = videos.video2.getContext('2d');
var back = document.createElement('canvas');
var backctx = back.getContext('2d');
const consts = {
    gaussianRadius :  1,
    cannyThreshold1: 20,
    cannyThreshold2: 60,
}
// set canvas size = video size when known
videos.video1.addEventListener('loadedmetadata', function() {
    videos.video2.width = videos.video1.videoWidth;
    videos.video2.height = videos.video1.videoHeight;
    back.width = videos.video1.videoWidth;
    back.height = videos.video1.videoHeight;
    let img = new Image();
    img.src = "./assets/videos/thumbnail.jpg";
    img.onload = function () {
        ctx.drawImage(img, 0, 0);
    }
});
videos.video1.addEventListener('play', function() {
    var $this = this;
    (function loop() {
        ctx.drawImage($this, 0, 0);
        imageProcess(ctx);
        if (!$this.paused && !$this.ended) {
        setTimeout(loop, 1000 / 30); // drawing at 30fps
        }
    })();
}, false);
const kernelGaussian = {
    "1": [
        [1, 2, 1],
        [2, 4, 2],
        [1, 2, 1]
    ],
    "2": [
        [1,  4,  6,  4, 1],
        [4, 16, 24, 16, 4],
        [6, 24, 36, 24, 6],
        [4, 16, 24, 16, 4],
        [1,  4,  6,  4, 1]
    ],
    "3": [
        [ 1,   6,  15,  20,  15,   6,  1],
        [ 6,  36,  90, 120,  90,  36,  6],
        [15,  90, 225, 300, 225,  90, 15],
        [20, 120, 300, 400, 300, 120, 20],
        [15,  90, 225, 300, 225,  90, 15],
        [ 6,  36,  90, 120,  90,  36,  6],
        [ 1,   6,  15,  20,  15,   6,  1]
    ],
    "4": [
        [ 1,   8,   28,   56,   70,   56,   28,   8,  1],
        [ 8,  64,  224,  448,  560,  448,  224,  64,  8],
        [28, 224,  784, 1568, 1960, 1568,  784, 224, 28],
        [56, 448, 1568, 3136, 3920, 3136, 1568, 448, 56],
        [70, 560, 1960, 3920, 4900, 3920, 1960, 560, 70],
        [56, 448, 1568, 3136, 3920, 3136, 1568, 448, 56],
        [28, 224,  784, 1568, 1960, 1568,  784, 224, 28],
        [ 8,  64,  224,  448,  560,  448,  224,  64,  8],
        [ 1,   8,   28,   56,   70,   56,   28,   8,  1]
    ]
}
const kernelCanny = {
    "0": [
        [ 1,  2,  1],
        [ 0,  0,  0],
        [-1, -2, -1]
    ],
    "1": [
        [1, 0, -1],
        [2, 0, -2],
        [1, 0, -1]
    ]
}
var grayscale = function(source, destination) {
    const imageData = source.getImageData(0, 0, videos.video1.videoWidth, videos.video1.videoHeight);
    const data = imageData.data;
    for (var i = 0; i < data.length; i += 4) {
        var avg = (3* data[i] + 4*data[i + 1] + data[i + 2]) >>> 3;
        data[i]     = avg;
        data[i + 1] = avg;
        data[i + 2] = avg;
    }
    destination.putImageData(imageData, 0, 0);
};
var gaussianBlur = function(source, destination, radius = 1) {
    let kernel = kernelGaussian[radius];
    let width = videos.video1.videoWidth;
    let height = videos.video1.videoHeight;
    const imageData = source.getImageData(0, 0, width, height);
    const destData = source.getImageData(0, 0, width, height);
    let data = imageData.data;
    let desdata = destData.data;
    let twiceRadius = 2 * radius;
    if (radius) {
        for(var x = 0; x < data.length; x+=4) 
            {
            let sum = 0;
            for (var i = 0; i <= twiceRadius; i++)
            for (var j = 0; j <= twiceRadius; j++) {
                sum += kernel[i][j] * data[x + ((j - radius) * width + i - radius) *4 ] || data[x];
            }
            sum = sum >>> (4*radius)
            desdata[x]     = sum;
            desdata[x + 1] = sum;
            desdata[x + 2] = sum;
        }
    }
    destination.putImageData(destData, 0, 0);
};
var canny = function(source, destination, lowThreshold, highThreshold) {
    let width = videos.video1.videoWidth;
    let height = videos.video1.videoHeight;
    const imageData = source.getImageData(0, 0, width, height);
    const destData = source.getImageData(0, 0, width, height);
    let data = imageData.data;
    let desdata = destData.data;
    let kernelX = kernelCanny[1];
    let kernelY = kernelCanny[0];
    //get gradient value and direction
    for(var x = 0; x < data.length; x+=4) 
        {
        let sumX = 0;
        let sumY = 0;
        for (var i = 0; i <= 2; i++)
        for (var j = 0; j <= 2; j++) {
            sumX += kernelX[i][j] * data[x + ((j - 1) * width + i - 1) *4 ] || data[x];
            sumY += kernelY[i][j] * data[x + ((j - 1) * width + i - 1) *4 ] || data[x];
        }
        let val = Math.round(Math.sqrt(sumX * sumX + sumY * sumY)) / 4;
        desdata[x]     = val > 255 ? 255 : val;
        let ang = Math.round(Math.atan2(sumY, sumX) / Math.PI * 4)
        desdata[x + 1] = ang + (ang < 0) && 4;
    }
    //non-max suppression
    for(var x = 0; x < data.length; x+=4) {
        if (desdata[x + 1] == 0){
            if (desdata[x] < desdata[x - 4 * width] || 0)
                desdata[x] = 0;
            if (desdata[x] < desdata[x + 4 * width] || 0)
                desdata[x] = 0;
        }
        if (desdata[x + 1] == 1){
            if (desdata[x] < desdata[x - 4 * width - 4] || 0)
                desdata[x] = 0;
            if (desdata[x] < desdata[x + 4 * width + 4] || 0)
                desdata[x] = 0;
        }
        if (desdata[x + 1] == 2){
            if (desdata[x] < desdata[x - 4] || 0)
                desdata[x] = 0;
            if (desdata[x] < desdata[x + 4] || 0)
                desdata[x] = 0;
        }
        if (desdata[x + 1] == 3){
            if (desdata[x] < desdata[x - 4 * width + 4] || 0)
                desdata[x] = 0;
            if (desdata[x] < desdata[x + 4 * width - 4] || 0)
                desdata[x] = 0;
        }
        desdata[x+1] = desdata[x];
        desdata[x+2] = desdata[x]
    }
    destination.putImageData(destData, 0, 0);
}
var imageProcess = function(target) {
    grayscale(target, target);
    gaussianBlur(target, backctx, consts.gaussianRadius);
    canny(backctx, target, consts.cannyThreshold1, consts.cannyThreshold2);
};


/** Read this
 * http://html5doctor.com/video-canvas-magic/
 */