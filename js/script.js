let gData;
let gRegions = [];
let gThresholds = {
  carriers: 0,
  discharged: 0,
  deaths: 0,
  pcrtested: 0
};


const LANG = $("html").attr("lang");
const SCROLLBAR_WIDTH = window.innerWidth - $(window).width();
const COLORS = {
  default: "#3DC",
  second: "#6DF",
  third: "#399",
  deaths: "#EB8",
  serious: "#FEA",
  pcrtests: "#6F6587,#5987A5,#3BA9B0,#48C7A6,#86E18D,#D5F474".split(","),
  dark: "#399",
  selected: "#EC2"
};
const LABELS = {
  ja: {
    change: "前日比",
    total: "合計",
    transition: {
      carriers: ["PCR検査陽性者数"],
      cases: ["入院治療等を要する者"],
      discharged: ["退院・療養解除"],
      serious: ["重症者数"],
      deaths: ["死亡者数"],
      pcrtested: ["PCR検査人数"],
      pcrtests: ["国立感染症研究所","検疫所","地方衛生研究所・保健所","民間検査会社","大学等","医療機関"],
      reproduction: ["実効再生産数"]
    },
    unit: {
      carriers: "名",
      cases: "名",
      discharged: "名",
      serious: "名",
      deaths: "名",
      pcrtested: "名",
      pcrtests: "件",
      reproduction: ""
    },
    age: [
      "80代以上",
      "70代",
      "60代",
      "50代",
      "40代",
      "30代",
      "20代",
      "10代",
      "10歳未満",
      "不明"
    ]
  },
  en: {
    change: "Daily: ",
    total: "Total",
    transition: {
      carriers: ["Tested Positive"],
      cases: ["Active Cases"],
      discharged: ["Discharged"],
      serious: ["Serious"],
      deaths: ["Deaths"],
      pcrtested: ["PCR Tested"],
      pcrtests: ["National Institute of Infectious Diseases","Quarantine Stations","Public Health Institute, Public Health Center","Private Testing Companies","Universities","Medical Institutions"],
      reproduction: ["Effective Reproduction Number"]
    },
    unit: {
      carriers: "",
      cases: "",
      discharged: "",
      serious: "",
      deaths: "",
      pcrtested: "",
      pcrtests: "",
      reproduction: ""
    },
    age: [
      "80s+",
      "70s",
      "60s",
      "50s",
      "40s",
      "30s",
      "20s",
      "10s",
      "Under 10",
      "Unknown"
    ]
  }
};



const init = () => {
  const addCommas = (num) => {
    return String(num).replace( /(\d)(?=(\d\d\d)+(?!\d))/g, '$1,');
  }

  const capitalize = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  }

  const updateThresholds = () => {
    const median = (values) => {
      let sorted = values.sort((a, b) => a - b);
      let is = [Math.floor(values.length / 2), Math.ceil(values.length / 2)];
      return (sorted[is[0]] + sorted[is[1]]) / 2;
    }

    for (thType in gThresholds) {
      let values = [];
      let rows = gData["prefectures-data"][thType].values;
      let latest = rows[rows.length - 1];
      for (let i = 0; i < latest.length; i++) {
        values.push(latest[i]);
      }
      gThresholds[thType] = median(values);
    }
  }

  const drawTransitionBoxes = () => {
    $(".transition.nationwide").each(function(){
      drawTransitionChart($(this), $(this).attr("code"), $(this).attr("pref"), true);
      moveToRight($(this));
    });
  }

  const updateAxisChartHeight = () => {
    $(".transition").each(function(){
      $(this).find(".axis-chart").css("height", "calc(100% - " + SCROLLBAR_WIDTH + "px)");
      $(this).find(".axis-cover").css("height", "calc(100% - " + SCROLLBAR_WIDTH + "px)");
    });
  }

  const drawLastDate = ($box, config) => {
    const getDateWithMonthName = (dateString) => {
      let dates = dateString.split("/");
      let months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
      return dates[1] + " " + months[parseInt(dates[0]) - 1];
    }

    let $updated = $box.find("h5.updated");
    if (!$updated.hasClass("show")) {
      let lastDate = config.data.labels[config.data.labels.length - 1];
      let updatedDate = {
        ja: lastDate.replace("/", "月") + "日時点",
        en: "As of " + getDateWithMonthName(lastDate)
      };

      $updated.text(updatedDate[LANG]);
      $updated.addClass("show");
    }
  }

  const drawTransitionChart = ($box, code, prefCode, hasDuration = false) => {

    const getBarColor = (code, prefCode, from, i, j) => {
      let ret = COLORS.default;
      let ymd = getDateValue(from, i, true);

      if (  (prefCode === "" && code === "deaths"     && ymd < 20200413)
        ||  (prefCode === "" && code === "carriers"   && ymd < 20200331)
        ||  (prefCode === "" && code === "discharged" && ymd < 20200420)
        ||  (prefCode === "" && code === "pcrtested"  && ymd < 20200303)
      ) {
        ret = COLORS.second;
      }

      if (ymd >= 20200508) {
        ret = COLORS.second;
      }

      if (prefCode === "" && code === "pcrtested" && 20200617 <= ymd) {
        ret = COLORS.default;
      }

      if ((prefCode === "13" && code === "pcrtested" && 20200617 <= ymd)
      ||  (prefCode === "28" && code === "pcrtested" && 20200618 <= ymd)
      ||  (prefCode === "22" && code === "pcrtested" && 20200621 <= ymd)
        ) {
        ret = COLORS.default;
      }

      if (prefCode === "" && code === "pcrtests") {
        ret = COLORS.pcrtests[j];
      }

      if (code === "reproduction") {
        ret = "#242A3C";
      }

      return ret;
    }

    const getDateValue = (from, i, isYmd) => {
      let dt = new Date(from[0], from[1] - 1, from[2]);
          dt.setDate(dt.getDate() + i);

      let ret = "";
      let cy = dt.getFullYear();
      let cm = dt.getMonth() + 1;
      let cd = dt.getDate();

      if (isYmd) {
        let ymd = (parseInt(cy) * 10000) + (parseInt(cm) * 100) + parseInt(cd);
        ret = ymd;

      } else {
        if (LANG === "ja") {
          ret = cm + "/" + cd;
        }

        if (LANG === "en") {
          ret = cm + "/" + cd;
        }
      }

      return ret;
    }

    const drawLatestValue = ($box, rows) => {
      let valueLatest = 0;
      let valuePrev   = 0;

      for (let i = 0; i < rows[0].length; i++) {
        valueLatest += rows[rows.length - 1][i];
        valuePrev   += rows[rows.length - 2][i];
      }

      let latestChange = Math.round((valueLatest - valuePrev) * 100) / 100;
      latestChange = addCommas(latestChange).toString();
          if (latestChange.charAt(0) !== "-") latestChange = "+" + latestChange;
      let $latest = $box.find(".latest");
          $latest.find(".value").text(addCommas(valueLatest));
          $latest.find(".unit").text(LABELS[LANG].unit[$box.attr("code")]);
          $latest.find(".type").text(capitalize($box.find(".switch[value=total]").text()));
          $latest.find(".change").text(LABELS[LANG].change + " " + latestChange);
    }

    const drawAxisChart = ($box, mainConfigData, isStacked) => {
      let $chart = $box.find(".axis-chart").empty().html("<canvas></canvas>");
      let $canvas = $chart.find("canvas")[0];

      let axisConfig = {
        type: "bar",
        data: mainConfigData,
        options: {
          maintainAspectRatio: false,
          legend: {
            display: false
          },
          title: {
            display: false
          },
          scales: {
            xAxes: [{
              stacked: isStacked,
              drawBorder: false,
              gridLines: {
                display: false
              },
              ticks: {
                fontColor: "rgba(255,255,255,0.0)",
                maxRotation: 0,
                minRotation: 0
              }
            }],
            yAxes: [{
              id: "axisScale",
              location: "bottom",
              stacked: isStacked,
              gridLines: {
                drawBorder: false,
                display: false
              },
              ticks: {
                beginAtZero: true,
                fontColor: "rgba(255,255,255,0.7)",
                callback: function(value, index, values) {
                  if (Math.floor(value) === value) {
                    return addCommas(value.toString());
                  }
                }
              }
            }]
          }
        }
      };

      axisConfig.data.datasets.forEach(function(dataset, i){
        dataset.backgroundColor = "transparent";
        dataset.borderColor = "transparent";
        dataset.pointBorderColor = "transparent";
      });

      axisConfig.data.labels.forEach(function(label, i){
        label = "";
      });

      window.myChart = new Chart($canvas.getContext('2d'), axisConfig);

      let axisMax = window.myChart.scales.axisScale.max;
      let axisMin = window.myChart.scales.axisScale.min;
      let axisMaxLength = Math.max(axisMax.toString().length, axisMin.toString().length);
      let axisCoverWidth = 0;
      switch(axisMaxLength) {
        case 1: axisCoverWidth = 22; break;
        case 2: axisCoverWidth = 26; break;
        case 3: axisCoverWidth = 34; break;
        case 4: axisCoverWidth = 40; break;
        case 5: axisCoverWidth = 52; break;
        case 6: axisCoverWidth = 58; break;
        case 7: axisCoverWidth = 64; break;
      }

      $box.find(".axis-cover").width(axisCoverWidth.toString() + "px");
    }

    let $chart = $box.find(".main-chart").empty().html("<canvas></canvas>");
    let $canvas = $chart.find("canvas")[0];
    let switchValue = $box.find(".switch.selected").attr("value");
    let hasMovingAverage = ($box.find(".checkbox.moving-average").hasClass("on")) ? true: false;

    let from = gData.transition[code].from;
    let rows = gData.transition[code].values;

    if (prefCode !== "") {
      from = gData["prefectures-data"][code].from;
      rows = [];
      gData["prefectures-data"][code].values.forEach(function(frow, i){
        rows.push([frow[parseInt(prefCode) - 1]]);
      });
    }

    drawLatestValue($box, rows);

    let config = {
      type: "bar",
      data: {
        labels: [],
        datasets: []
      },
      options: {
        maintainAspectRatio: false,
        animation: {
          duration: (hasDuration) ? 1000: 0
        },
        legend: {
          display: false
        },
        title: {
          display: false
        },
        tooltips: {
          xPadding: 24,
          yPadding: 12,
          displayColors: false,
          callbacks: {
            title: function(tooltipItem){
              let dateTime = tooltipItem[0].xLabel.trim();
              if (LANG === "ja") dateTime = dateTime.replace("/","月") + "日時点";
              if (LANG === "en") dateTime = "As of " + dateTime;
              let suffix = $box.find(".switch.selected").text();
              return dateTime + " " + suffix;
            },
            label: function(tooltipItem, data){
              let ret = [];
              let total = 0;
              data.datasets.forEach(function(ds, i){
                if (!hasMovingAverage || i >= 1) {
                  ret.push(ds.label + ": " + addCommas(ds.data[tooltipItem.index]) + " " + LABELS[LANG].unit[code]);
                  total += ds.data[tooltipItem.index];
                }
              });
              let showTotalLength = (hasMovingAverage) ? 3: 2;
              if (data.datasets.length >= showTotalLength) {
                ret.push(LABELS[LANG].total + ": " + addCommas(total) + " " + LABELS[LANG].unit[code]);
              }
              return ret;
            }
          }
        },
        scales: {
          xAxes: [{
            stacked: true,
            gridLines: {
              display: false,
              zeroLineColor: "rgba(255,255,0,0.7)"
            },
            ticks: {
              fontColor: "rgba(255,255,255,0.7)",
              maxRotation: 0,
              minRotation: 0,
              callback: (label) => {
                return " " + label + " ";
              }
            }
          }],
          yAxes: [{
            location: "bottom",
            stacked: true,
            gridLines: {
              display: true,
              zeroLineColor: "rgba(255,255,255,0.7)",
              borderDash: [3, 1],
              color: "rgba(255, 255, 255, 0.3)"
            },
            ticks: {
              beginAtZero: true,
              fontColor: "transparent"
            }
          }]
        },
        layout: {
          padding: {
            left: 10
          }
        }
      }
    };

    for (let i = 0; i < rows[0].length; i++) {
      config.data.datasets.push({
        label: LABELS[LANG].transition[code][i],
        backgroundColor: [],
        data: []
      });

      if (code === "reproduction") {
        let ds = config.data.datasets[config.data.datasets.length - 1];
        ds.type = "line";
        ds.fill = false;
        ds.pointRadius = 2;
        ds.pointBorderColor = "#EC2";
        ds.borderColor = "#EC2";
      }
    }

    let prevBarColor = "";
    rows.forEach(function(row, i){
      let curBarColor = getBarColor(code, prefCode, from, i, 0);

      config.data.labels.push(getDateValue(from, i, false));

      for (let j = 0; j < rows[0].length; j++) {
        let value = row[j];

        if (switchValue === "new") {
          value = 0;
          if (prevBarColor === curBarColor && row[j] !== "" && rows[i - 1][j] !== "") {
            value = row[j] - rows[i - 1][j];
            if (value < 0 && (code === "carriers" || code === "discharged" || code === "deaths" || code === "pcrtested" || code === "pcrtests")) {
              value = 0;
            }
          }
        }

        config.data.datasets[j].data.push(value);
        config.data.datasets[j].backgroundColor.push(getBarColor(code, prefCode, from, i, j));
      }

      prevBarColor = curBarColor;
    });

    $chart.width(Math.max(config.data.labels.length * 8, $chart.width()));

    if (hasMovingAverage) {
      let days = 7;
      let dataset = {
        type: "line",
        label: LABELS[LANG].movingAverage,
        fill: false,
        borderColor: "#EDA",
        borderWidth: 3,
        pointRadius: 0,
        data: []
      };

      for (let i = 0; i < config.data.datasets[0].data.length; i++) {
        let value = null;
        if (i >= days) {
          value = 0;
          for (let j = 0; j < days; j++) {
            config.data.datasets.forEach(function(dataset, dsi){
              value += parseInt(dataset.data[i - j]);
            });
          }
          value = value / days;
        }

        dataset.data.push(value);
      }

      config.data.datasets.unshift(dataset);
    }

    drawLastDate($box, config);
    drawAxisChart($box, $.extend(true, {}, config.data), true);

    window.myChart = new Chart($canvas.getContext('2d'), config);
  }

  const moveToRight = ($box) => {
    let $chart = $box.find(".main-chart");
    let $wrapper = $box.find(".main-chart-wrapper");
    $wrapper.animate({scrollLeft: $chart.width()}, 0);
  }

  const getPrefColor = (prefCode) => {
    let type = $("#select-pref-type").val();
    let ret = "rgba(90, 90, 90, 0.6)";
    let value = gData["prefectures-data"][type].values[gData["prefectures-data"][type].values.length - 1][parseInt(prefCode) - 1];
    if (value >= 1) {
      ret = COLORS.dark;
      if (gThresholds[type] === 0) ret = COLORS.default;
    }
    if (value >= gThresholds[type] && gThresholds[type] >= 1) ret = COLORS.default;
    return ret;
  }

  const drawJapanMap = () => {
    $("#japan-map").empty();
    const WIDTH = $("#japan-map").width();

    let prefs = [];
    gData["prefectures-map"].forEach(function(pref, i){
      prefs.push({
        code: pref.code,
        jp: pref.ja,
        en: pref.en,
        color: getPrefColor(pref.code),
        hoverColor: COLORS.selected,
        prefectures: [pref.code]
      });
    });

    $("#japan-map").japanMap({
      areas: prefs,
      selection: "prefecture",
      width: WIDTH,
      borderLineColor: "#242a3c",
      borderLineWidth : 0.25,
      lineColor : "#ccc",
      lineWidth: 1,
      drawsBoxLine: false,
      showsPrefectureName: false,
      movesIslands : true,
      onHover: function(data){
        drawRegionChart(data.code);
        drawPrefectureCharts(data.code);
      }
    });
  }

  const drawDemographyChart = () => {
    $wrapper = $("#demography-chart").empty().html('<canvas></canvas>');
    $canvas = $wrapper.find("canvas")[0];

    let config = {
      type: "horizontalBar",
      data: {
        labels: [],
        datasets: [{
          label: "",
          backgroundColor: COLORS.default,
          borderWidth: 0.5,
          borderColor: "#242a3c",
          data: []
        }]
      },
      options: {
        aspectRatio: 0.9,
        responsive: true,
        legend: {
          display: false
        },
        title: {
          display: false
        },
        tooltips: {
          xPadding: 24,
          yPadding: 12,
          displayColors: false,
          callbacks: {
            title: function(tooltipItem){
              return tooltipItem[0].yLabel;
            },
            label: function(tooltipItem, data){
              let suffix = {
                ja: "名",
                en: " cases"
              };
              return addCommas(tooltipItem.value) + suffix[LANG];
            }
          }
        },
        scales: {
          xAxes: [{
            stacked: true,
            position: "top",
            gridLines: {
              color: "rgba(255,255,255,0.2)",
              zeroLineColor: "rgba(255,255,255,0.2)",
              borderDash: [3, 1]
            },
            ticks: {
              suggestedMin: 0,
              fontColor: "rgba(255,255,255,0.7)",
              callback: function(value, index, values) {
                return addCommas(value);
              }
            }
          }],
          yAxes: [{
            stacked: true,
            barPercentage: 0.7,
            gridLines: {
              color: "rgba(255,255,255,0.1)"
            },
            ticks: {
              fontColor: "rgba(255,255,255,0.7)"
            }
          }]
        }
      }
    };

    if ($wrapper.outerWidth() >= 400) config.options.aspectRatio = 1.1;
    if ($wrapper.outerWidth() >= 600) config.options.aspectRatio = 1.3;

    gData.demography.forEach(function(age, index){
      config.data.labels.push(LABELS[LANG].age[index]);
      config.data.datasets[0].data.push(age);
    });

    let ctx = $canvas.getContext('2d');
    window.myChart = new Chart(ctx, config);
  }

  const drawRegionChart = (prefCode) => {
    let $wrapper = $("#region-chart").empty().html('<canvas></canvas>');
    let $canvas = $wrapper.find("canvas")[0];
    let dataType = $("#select-pref-type").val();

    let config = {
      type: "horizontalBar",
      data: {
        labels: [],
        datasets: [{
          label: "",
          backgroundColor: [],
          data: []
        }]
      },
      options: {
        aspectRatio: 0.4,
        animation: {
          duration: 1000
        },
        responsive: true,
        legend: {
          display: false
        },
        title: {
          display: false
        },
        tooltips: {
          xPadding: 24,
          yPadding: 12,
          displayColors: true,
          callbacks: {
            title: function(tooltipItem){
              gData["prefectures-map"].forEach(function(pref, i){
                if (pref.ja === tooltipItem[0].yLabel || pref.en === tooltipItem[0].yLabel) {
                  if ($("#select-prefecture").val() !== pref.code) {
                    drawPrefectureCharts(pref.code);
                  }
                }
              });
              return tooltipItem[0].yLabel;
            },
            label: function(tooltipItem, data){
              let suffix = {
                ja: " 名",
                en: " cases"
              };
              return tooltipItem.xLabel + suffix[LANG];
            }
          }
        },
        scales: {
          xAxes: [{
            position: "top",
            gridLines: {
              color: "rgba(255,255,255,0.2)"
            },
            ticks: {
              suggestedMin: 0,
              fontColor: "rgba(255,255,255,0.7)",
              callback: function(value, index, values) {
                return addCommas(value);
              }
            }
          }],
          yAxes: [{
            gridLines: {
              color: "rgba(255,255,255,0.1)"
            },
            ticks: {
              fontColor: "rgba(255,255,255,0.7)",
            }
          }]
        }
      }
    };

    if ($wrapper.outerWidth() >= 400) config.options.aspectRatio = 0.5;
    if (prefCode !== "") config.options.animation.duration = 0;

    let prefs = [];
    gData["prefectures-data"][dataType].values[gData["prefectures-data"][dataType].values.length - 1].forEach(function(value, i){
      prefs.push({
        name: gData["prefectures-map"][i][LANG],
        value: value,
        code: (i + 1).toString()
      });
    });

    prefs.sort((a, b) => {
      if(a.value < b.value) return 1;
      if(a.value > b.value) return -1;
      return 0;
    });

    prefs.forEach(function(pref, i){
      config.data.labels.push(pref.name);
      config.data.datasets[0].data.push(pref.value);

      if (prefCode == pref.code) {
        config.data.datasets[0].backgroundColor.push(COLORS.selected);
      } else {
        config.data.datasets[0].backgroundColor.push(getPrefColor(pref.code));
      }
    });

    let ctx = $canvas.getContext('2d');
    window.myChart = new Chart(ctx, config);
  }

  const drawPrefectureCharts = (prefCode) => {
    $("#select-prefecture").val(prefCode);
    $(".transition.prefecture").each(function(){
      $(this).attr("pref", prefCode);
      $(this).find("h3").find("span").text(gData["prefectures-map"][parseInt(prefCode) - 1][LANG]);
      drawTransitionChart($(this), $(this).attr("code"), $(this).attr("pref"), true);
      moveToRight($(this));
    });
  }

  const showUpdateDate = () => {
    $(".updated-last").text(gData.updated.last[LANG]);
    $(".updated-demography").text(gData.updated.demography[LANG]);
  }

  const loadData = () => {
    $.getJSON("data/data.json", function(data){
      gData = data;
      updateThresholds();
      drawTransitionBoxes();
      drawDemographyChart();
      drawJapanMap();
      drawRegionChart("");
      drawPrefectureCharts("13");
      showUpdateDate();
      updateAxisChartHeight();
      $("#cover-block").fadeOut();
    })
  }

  const bindEvents = () => {
    $(".transition").find(".switch").on("click",function(){
      let $box = $(this).closest(".transition");
      $(this).siblings(".switch").removeClass("selected");
      $(this).addClass("selected");
      drawTransitionChart($box, $box.attr("code"), $box.attr("pref"), true);
    });

    $("#select-prefecture").on("change", function(){
      let prefCode = $(this).val();
      drawPrefectureCharts(prefCode);
    });

    $("#select-pref-type").on("change", function(){
      drawJapanMap();
      drawRegionChart("");
    });

    $(".more").on("click",function(){
      $(this).closest("p.notes").addClass("show");
    });

    $(".checkboxes").find(".checkbox").on("click", function(){
      if ($(this).hasClass("on")) {
        $(this).removeClass("on");
      } else {
        $(this).addClass("on");
      }
      let $box = $(this).closest(".transition");
      drawTransitionChart($box, $box.attr("code"), $box.attr("pref"), false);
    });

    $('a[href^="#"]').click(function() {
      let href = $(this).attr("href");
      let position = $(href).offset().top;
      $('body,html').animate({scrollTop: position}, 400, 'swing');
      return false;
    });
  }

  loadData();
  bindEvents();
};


$(function(){
  init();
});
