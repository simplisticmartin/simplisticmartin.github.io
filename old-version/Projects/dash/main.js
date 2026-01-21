
var focusChart = dc.seriesChart("#test");
var overviewChart = dc.seriesChart("#test-overview");
var pieChart = dc.pieChart("#piechart");
var theStatsRingChart = dc.pieChart("#stats-pie");

var teams = ['Boston 2008', 'Chicago 1996', 'Chicago 1997', 
'Cleveland 2016', 'Golden State 2015', 'Golden State 2017',  
'Los Angeles 2002', 'Los Angeles 2009', 'Miami 2013', 'San Antonio 2014'];

var cvsNdx, runDimension, runGroup, overviewRunDimension, overviewRunGroup;
d3.csv("finalData.csv").then(function(experiments) {

  ndx = crossfilter(experiments);

  // console.log(ndx.dimension(function (d) {
  //   console.log(d3.entries(d))
  // }));

  runDimension = ndx.dimension(function(d) {return [+d.TEAM, +d.GAME]; });

  // console.log(runDimension.top(Infinity));
  // var gamesDomain = Math.floor(runDimension.top(Infinity).length / teams.length);

  overviewRunDimension = ndx.dimension(function(d) {return [+d.TEAM, +d.GAME]; });
  runGroup = runDimension.group().reduceSum(function(d) { return +d.ELO; });
  overviewRunGroup = overviewRunDimension.group().reduceSum(function(d) { return +d.ELO; });

  var yDataSize = runGroup.top(Infinity).length;

  var maxY = runGroup.top(1)[0].value;
  var minY = runGroup.top(Infinity)[yDataSize-1].value;


  // console.log(yMin, ' ---- y min');

  focusChart
    .width(768)
    .height(480)
    .chart(function(c) { return dc.lineChart(c).curve(d3.curveCardinal).evadeDomainFilter(true); })
    .x(d3.scaleLinear().domain([0,82]))
    .y(d3.scaleLinear().domain([minY,maxY]))
    // .forceY([1200,1900])
    .brushOn(false)
    .yAxisLabel("ELO")
    .yAxisPadding("10%")
    .xAxisLabel("Games Played")
    // .elasticY(true)
    .dimension(runDimension)
    .group(runGroup)
    .ordinalColors(['#e6194B','#f58231','#ffe119','#bfef45','#3cb44b','#42d4f4','#4363d8', '#911eb4', '#f032e6', '#a9a9a9'])
    .mouseZoomable(true)
    .rangeChart(overviewChart)
    .seriesAccessor(function(d) {return teams[d.key[0] - 1];})
    .keyAccessor(function(d) {return +d.key[1];})
    .valueAccessor(function(d) {return +d.value;})
    .legend(dc.htmlLegend().container('#legend').horizontal(false).highlightSelected(true));
  // focusChart.yAxis().tickFormat(function(d) {return d3.format(',d')(d);});
  focusChart.margins().left += 40;
  
  overviewChart
    .width(768)
    .height(100)
    .chart(function(c) { return dc.lineChart(c).curve(d3.curveCardinal); })
    .x(d3.scaleLinear().domain([0,82]))
    .y(d3.scaleLinear().domain([minY,maxY]))
    .brushOn(true)
    .xAxisLabel("Games Played")
    .clipPadding(10)
    .dimension(runDimension)
    .group(runGroup)
    .ordinalColors(['#e6194B','#f58231','#ffe119','#bfef45','#3cb44b','#42d4f4','#4363d8', '#911eb4', '#f032e6', '#a9a9a9'])
    .seriesAccessor(function(d) {return teams[d.key[0] - 1];})
    .keyAccessor(function(d) {return +d.key[1];});
    // .valueAccessor(function(d) {return +d.value;});


  var statsDimension = ndx.dimension(function (d) {
    // console.log(Object.keys(d));
    // console.log([teams[d.TEAM - 1]]);
    return [teams[d.TEAM - 1]];
  });


  var sumGroup = statsDimension.group().reduceSum(function(d) {
    return d.GAME;
  });

  pieChart
    .width(540)
    .height(360)
    .slicesCap(teams.length)
    .innerRadius(25)
    .externalLabels(50)
    .externalRadiusPadding(50)
    .drawPaths(true)
    .dimension(statsDimension)
    .ordinalColors(['#e6194B','#f58231','#ffe119','#bfef45','#3cb44b','#42d4f4','#4363d8', '#911eb4', '#f032e6', '#a9a9a9'])
    .group(sumGroup);
  pieChart.on('pretransition', function(chart) {
      pieChart.selectAll('.pie-slice')
          .on('click', function(d) {
            runGroup = runDimension.group().reduceSum(function(d) { return +d['3P%']; });
            overviewRunGroup = overviewRunDimension.group().reduceSum(function(d) { return +d['3P%']; });
            yDataSize = runGroup.top(Infinity).length;

            maxY = runGroup.top(1)[0].value;
            minY = runGroup.top(Infinity)[yDataSize-1].value;
            focusChart
              .group(runGroup)
              .y(d3.scaleLinear().domain([minY,maxY]))
              .redraw()
            console.log(teams[d.index]);
          });
  })


  
  var data = [
    {"player":"FG", "theStats":1,},
    {"player":"FGA", "theStats":1,},
    {"player":"FG%", "theStats":1},
    {"player":"3P", "theStats":1},
    {"player":"ELO", "theStats":1},
    {"player":"3PA", "theStats":1,},
    {"player":"3P%", "theStats":1,},
    {"player":"FT", "theStats":1},
    {"player":"FTA", "theStats":1},
    {"player":"FT%", "theStats":1},
    {"player":"ORB", "theStats":1,},
    {"player":"DRB", "theStats":1,},
    {"player":"TRB", "theStats":1},
    {"player":"AST", "theStats":1},
    {"player":"STL", "theStats":1},
    {"player":"BLK", "theStats":1},
    {"player":"TOV", "theStats":1},
    {"player":"PF", "theStats":1},
    ];

  var ndx = crossfilter(data);
  var playerDim = ndx.dimension(function(d) {return d.player;});  

  var dummyGroup = playerDim.group().reduceSum(function(d) {return d.theStats;});

  theStatsRingChart
          .width(300)
          .height(300)
          .slicesCap(20)
          .innerRadius(20)
          .dimension(dummyGroup)
          .group(dummyGroup)
          .ordinalColors(['#e6194B','#f58231','#ffe119','#bfef45','#3cb44b','#42d4f4','#4363d8', '#911eb4', '#f032e6', '#a9a9a9',
            '#800000', '#aaffc3', '#e6beff', '#ffd8b1', '#469990', '#fabebe', '#9A6324', '#808000'])
          .renderLabel(true)
          .minAngleForLabel(0);
  theStatsRingChart.on('pretransition', function(chart) {
    theStatsRingChart.selectAll('.pie-slice')
        .on('click', function(d) {
          console.log(d.data.key);
          var newStat = d.data.key;
            runGroup = runDimension.group().reduceSum(function(d) { return +d[newStat]; });
            overviewRunGroup = overviewRunDimension.group().reduceSum(function(d) { return +d[newStat]; });
            yDataSize = runGroup.top(Infinity).length;

            maxY = runGroup.top(1)[0].value;
            minY = runGroup.top(Infinity)[yDataSize-1].value;
            focusChart
              .group(runGroup)
              .yAxisLabel(newStat)
              .y(d3.scaleLinear().domain([minY,maxY]))
              .redraw()
            overviewChart
              .group(overviewRunGroup)
              .y(d3.scaleLinear().domain([minY,maxY]))
              .redraw()
          // dc.renderAll();
        });
  })

  dc.renderAll();
});

