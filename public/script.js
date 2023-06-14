const currentPage = location.pathname;
const reportData = true;
const colorBackground = "rgba(254, 254, 254, 1.0)";
const seTilt = false;
const EPenButton = {
  tip: 0x1, // left mouse, touch contact, pen contact
  barrel: 0x2, // right mouse, pen barrel button
  middle: 0x4, // middle mouse
  eraser: 0x20, // pen eraser button
};

let timestamp, chartVelocity, chartPressure;
const examData = [];
const examTime = [];
const examDataObj = [];
const eventsWriting = [];
const speedModule = [];
const pressureGrafic = [];

const examArea = document.getElementById("examArea");
const contextExamArea = examArea.getContext("2d");
var myCanvas = document.getElementById("examArea");
var context = myCanvas.getContext("2d");

var supportsPointerEvents = window.PointerEvent;
var inStroke = false;
var posLast = { x: 0, y: 0 };
var isDrawing = false;
var useTilt = false;

function initPage() {
  setCanvasProps();
}
/////////////////////////////////////////////////////////////////////////
// Init canvas properties.
// Sets canvas width to expand to browser window.
// Canvas cleared to restore background color.
//
function setCanvasProps() {
  if (myCanvas.width < window.innerWidth) {
    myCanvas.width = window.innerWidth - 400;
  }
  clearCanvas(); // ensures background saved with drawn image
}

/////////////////////////////////////////////////////////////////////////
// Sets a flag to enable/disable use of the pen tilt property.
//
function setTilt() {
  var useTiltVal = document.querySelector('input[value="useTilt"]');
  useTilt = useTiltVal.checked;
}

/////////////////////////////////////////////////////////////////////////
// Clears the drawing canvas.
//
function clearCanvas() {
  context.fillStyle = colorBackground;
  context.fillRect(0, 0, myCanvas.width, myCanvas.height);
}

/////////////////////////////////////////////////////////////////////////
// Saves the image on the drawing canvas and then downloads a png.
//
function saveCanvas() {
  var link = document.getElementById("link");
  link.setAttribute("download", "escrita.png");
  link.setAttribute(
    "href",
    myCanvas.toDataURL("image/png").replace("image/png", "image/octet-stream")
  );
  link.click();

  var a = document.getElementById("velocidade");
  a.setAttribute("download", "velocidade.png");
  a.href = ctx.toBase64Image();
  a.download = "velocidade.png";

  // Trigger the download
  a.click();
}

/////////////////////////////////////////////////////////////////////////
// Upon a window load event, registers all events.
//
window.addEventListener(
  "load",
  function () {
    // These events are handled for browsers that do not
    // handle PointerEvent.
    var events = [
      "MSPointerDown",
      "MSPointerUp",
      "MSPointerCancel",
      "MSPointerMove",
      "MSPointerOver",
      "MSPointerOut",
      "MSPointerEnter",
      "MSPointerLeave",
      "MSGotPointerCapture",
      "MSLostPointerCapture",
      "touchstart",
      "touchmove",
      "touchend",
      "touchenter",
      "touchleave",
      "touchcancel",
      "mouseover",
      "mousemove",
      "mouseout",
      "mouseenter",
      "mouseleave",
      "mousedown",
      "mouseup",
      "focus",
      "blur",
      "click",
      "webkitmouseforcewillbegin",
      "webkitmouseforcedown",
      "webkitmouseforceup",
      "webkitmouseforcechanged",
    ];

    // These events are for browsers that handle
    // HTML5 PointerEvent events.
    var pointerEvents = [
      "pointerdown",
      "pointerup",
      "pointercancel",
      "pointermove",
      "pointerover",
      "pointerout",
      "pointerenter",
      "pointerleave",
      "gotpointercapture",
      "lostpointercapture",
    ];

    /////////////////////////////////////////////////////////////////////////
    // Handle event rendering and reporting to output
    // for traditional mouse/touch/pen handling.
    //
    eventDraw = function (evt) {
      var outStr = evt.type;
      var canvasRect = myCanvas.getBoundingClientRect();
      var screenPos = {
        x: evt.clientX,
        y: evt.clientY,
      };

      var pos = {
        x: screenPos.x - canvasRect.left,
        y: screenPos.y - canvasRect.top,
      };

      console.log("screenPos XY:" + screenPos.x + "," + screenPos.y);

      if (pos.x == undefined || pos.y == undefined) {
        console.log("WARNING: undefined position");
        return;
      }

      var pressure = evt.pressure;

      if (
        typeof evt.targetTouches != "undefined" &&
        evt.targetTouches.length > 0 &&
        typeof evt.targetTouches[0].force != "undefined"
      ) {
        outStr += " - force: " + evt.targetTouches[0].force;
      } else if (typeof evt.webkitForce != "undefined") {
        outStr += " - webkitForce: " + evt.webkitForce;
      } else if (typeof pressure != "undefined") {
        outStr += " - pressure: " + pressure;
      }

      if (typeof pressure == "undefined") {
        pressure = 1.0;
      }

      switch (evt.type) {
        case "mousedown":
        case "MSPointerDown":
        case "touchStart":
          isDrawing = true;
          posLast = pos;
          break;

        case "mouseup":
        case "MSPointerUp":
        case "touchEnd":
          isDrawing = false;
          break;

        case "mousemove":
        case "MSPointerMove":
        case "touchmove":
          if (isDrawing) {
            context.lineWidth = pressure;

            context.beginPath();
            context.lineCap = "round";
            context.moveTo(posLast.x, posLast.y);

            // Draws Bezier curve from context position to midPoint.
            var midPoint = midPointBetween(posLast, pos);
            context.quadraticCurveTo(
              posLast.x,
              posLast.y,
              midPoint.x,
              midPoint.y
            );

            // This lineTo call eliminates gaps (but leaves flat lines if stroke
            // is fast enough).
            context.lineTo(pos.x, pos.y);
            context.stroke();
          }

          posLast = pos;
          break;

        default:
          break;
      }

      // Update the readout asynchronously to the event thread.
      if (reportData) {
        outStr += "<br>";
        setTimeout(function () {
          delayedInnerHTMLFunc(outStr);
        }, 100);
      }
    };

    /////////////////////////////////////////////////////////////////////////
    // Find point between two other points.
    //
    function midPointBetween(p1, p2) {
      return {
        x: p1.x + (p2.x - p1.x) / 2,
        y: p1.y + (p2.y - p1.y) / 2,
      };
    }

    /////////////////////////////////////////////////////////////////////////
    // Handle drawing for HTML5 Pointer Events.
    //
    function pointerEventDraw(evt) {
      var outStr = "";
      var stringEvents = "";
      var canvasRect = myCanvas.getBoundingClientRect();
      var screenPos = {
        x: evt.clientX,
        y: evt.clientY,
      };

      var pos = {
        x: screenPos.x - canvasRect.left,
        y: screenPos.y - canvasRect.top,
      };

      var pressure = evt.pressure;
      var buttons = evt.buttons;
      var tilt = { x: evt.tiltX, y: evt.tiltY };
      var rotate = evt.twist;

      if (reportData) {
        stringEvents = evt.pointerType + " , " + evt.type + " , ";
      }

      if (evt.pointerType) {
        switch (evt.pointerType) {
          case "touch":
            // A touchscreen was used
            pressure = 1.0;
            context.strokeStyle = "black";
            context.lineWidth = pressure;
            break;
          case "pen":
            // A pen was used
            if (buttons == EPenButton.barrel) {
              context.strokeStyle = "black";
            } else {
              context.strokeStyle = "black";
            }

            if (useTilt) {
              // Favor tilts in x direction.
              context.lineWidth = pressure * 3 * Math.abs(tilt.x);
              // Uncomment for a "vaseline" (smeary) effect:
              //context.shadowColor = "blue";
              //context.shadowBlur = context.lineWidth / 2;
            } else {
              context.lineWidth = pressure * 10;
            }
            break;
          case "mouse":
            // A mouse was used
            //pressure = 2;
            //context.lineWidth = pressure;
            context.strokeStyle = "black";
            if (buttons == EPenButton.barrel) {
              pressure = 0.5;
              context.lineWidth = 0;
            }

            context.lineWidth = pressure;
            break;
        }

        // If pen erase button is being used, then erase!
        if (buttons == EPenButton.eraser) {
          context.strokeStyle = colorBackground;
        }

        switch (evt.type) {
          case "pointerdown":
            isDrawing = true;
            posLast = pos;
            break;

          case "pointerup":
            isDrawing = false;
            break;

          case "pointermove":
            if (!isDrawing) {
              return;
            }

            // If using eraser button, then erase with background color.
            if (buttons == EPenButton.eraser) {
              var eraserSize = 10;
              context.fillStyle = colorBackground;
              context.fillRect(pos.x, pos.y, eraserSize, eraserSize);
              context.fill;
            } else if (pressure > 0) {
              context.beginPath();
              context.lineCap = "round";
              context.moveTo(posLast.x, posLast.y);

              // Draws Bezier curve from context position to midPoint.
              var midPoint = midPointBetween(posLast, pos);
              context.quadraticCurveTo(
                posLast.x,
                posLast.y,
                midPoint.x,
                midPoint.y
              );

              // This lineTo call eliminates gaps (but leaves flat lines if stroke
              // is fast enough).
              context.lineTo(pos.x, pos.y);
              context.stroke();
            }

            posLast = pos;
            break;

          case "pointerenter":
            document.body.style.cursor = "crosshair";
            break;

          case "pointerleave":
            document.body.style.cursor = "default";
            break;

          default:
            console.log("WARNING: unhandled event: " + evt.type);
            break;
        }

        // Reporting data will cause drawing lag, resulting in flat lines.
        // IE11 barfs on Number.parseFloat(xxxx).toFixed(3)
        if (reportData) {
          outStr +=
            "x:" +
            parseFloat(screenPos.x) +
            ",y:" +
            parseFloat(screenPos.y) +
            ",p:" +
            parseFloat(pressure).toFixed(3) +
            ",b:" +
            buttons;

          setTimeout(function () {
            examData.push([Date.now(), outStr]);
            eventsWriting.push([parseFloat(String(Date.now())), stringEvents]);
          }, 100);
        }
      }
    }

    if (supportsPointerEvents) {
      // if Pointer Events are supported, only listen to pointer events
      for (let idx = 0; idx < pointerEvents.length; idx++) {
        myCanvas.addEventListener(pointerEvents[idx], pointerEventDraw, false);
      }
    } else {
      // traditional mouse/touch/pen event handlers
      for (let idx = 0; idx < events.length; idx++) {
        myCanvas.addEventListener(events[idx], eventDraw, false);
      }
    }
  },
  true
);
//console.log("dados: ", examData);

/////////////////////////////////////////////////////////////////////////
////////////////////////REPORT
const timeUp = [];

function linspace(start, stop, num, endpoint = true) {
  const div = endpoint ? num - 1 : num;
  const step = (stop - start) / div;
  return Array.from({ length: num }, (_, i) => start + step * i);
}
var ctx, ctxp;
function report() {
  for (let i = 0; i < examData.length; i++) {
    examTime.push(examData[i][0]);
    const substrings = examData[i][1].split(",");
    const obj = {};
    substrings.forEach((sub) => {
      const parts = sub.split(":");
      const key = parts[0];
      const value = parts[1];
      obj[key] = parseFloat(value);
    });
    examDataObj.push(obj);
  }

  //  px / seconds
  for (let i = 0; i < examDataObj.length - 1; i++) {
    const diffX =
      parseInt(examDataObj[i + 1]["x"]) - parseInt(examDataObj[i]["x"]);
    const diffY =
      parseInt(examDataObj[i + 1]["y"]) - parseInt(examDataObj[i]["y"]);
    const diffT = (examTime[i + 1] - examTime[i]) / 1000; //seconds
    const speedWriting = parseInt(
      Math.sqrt((diffX / diffT) ** 2 + (diffY / diffT) ** 2)
    );
    speedModule.push(speedWriting);
    pressureGrafic.push(examDataObj[i]["p"]);

    if (examDataObj[i]["p"] == 0 && i < examDataObj.length) {
      timeUp.push((examTime[i + 1] - examTime[i]) / 1000);
    }
  }

  const tempmax = (examTime.at(-1) - examTime[0]) / 1000;
  const tempoTotalElement = document.getElementById("totalTemp");
  tempoTotalElement.textContent +=
    " O tempo total é de: " + tempmax.toFixed(2) + " segundos";

  const sumtimeUP = timeUp.reduce(
    (accumulator, value) => accumulator + value,
    0
  );
  const tempoUP = document.getElementById("upTemp");
  tempoUP.textContent +=
    "Tempo caneta em suspensão: " + sumtimeUP.toFixed(2) + " segundos";

  const writting = tempmax.toFixed(2) - sumtimeUP.toFixed(2);

  const tempowritting = document.getElementById("downTemp");
  tempowritting.textContent +=
    "Tempo escrevendo: " + writting.toFixed(2) + " segundos";

  var tempo = linspace(0, tempmax, examTime.length, (endpoint = true));

  ctx = document.getElementById("velocidad").getContext("2d");
  chartVelocity = new Chart(ctx, {
    type: "line",
    data: {
      labels: tempo,
      datasets: [
        {
          label: "Velocidade",
          data: speedModule,
          borderColor: "blue",
          fill: false,
          tension: 0.1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: "Velocidade [pixel/s] ",
        },
      },
      scales: {
        x: {
          type: "linear",
          position: "bottom",
        },
      },
    },
  });
  var ctxp = document.getElementById("pressao").getContext("2d");
  chartPressure = new Chart(ctxp, {
    type: "line",
    data: {
      labels: tempo,
      datasets: [
        {
          label: "pressao",
          data: pressureGrafic,
          borderColor: "red",
          fill: false,
          tension: 0.1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: "Pressao: (0 ~ 1.000) ",
        },
      },
      scales: {
        x: {
          type: "linear",
          position: "bottom",
        },
      },
    },
  });

  var canvasVelocity = document.getElementById("velocidad");
  var graficVelocity = canvasVelocity.toDataURL("image/jpeg", 1.0);
  console.log(graficVelocity);
  var canvasPressure = document.getElementById("pressao");
  var graficPressure = canvasPressure.toDataURL("image/jpeg", 1.0);

  function getChartImage() {
    var canvas = document.getElementById("velocidad");
    var chartDataURL = canvas.toDataURL("image/jpeg", 1.0);
    return chartDataURL;
  }

  var docDefinition = {
    content: [
      {
        text: "Relatório da Dinânica da Escrita: ",
        fontSize: 20,
        bold: true,
        margin: [0, 0, 0, 10],
      },
      { image: graficVelocity, with: 400, aligment: "center" },
    ],
  };
  pdfMake.createPdf(docDefinition).download("relatorio.pdf");

  const doc = new jspdf.jsPDF();
  doc.addImage(graficVelocity, "JPEG", 10, 10, 190, 100);
  doc.setFontSize(12);
  doc.text(
    "Este é um relatório com o gráfico plotado usando Chart.js.",
    10,
    120
  );
  doc.save("rel.pdf");
}
