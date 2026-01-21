var punchesLanded = [
  { y: "1", Wilder: 4, Fury: 6},
  { y: '2', Wilder: 3, Fury: 5},
  { y: '3', Wilder: 4,  Fury: 11},
  { y: '4', Wilder: 5,  Fury: 7},
  { y: '5', Wilder: 6,  Fury: 7},
  { y: '6', Wilder: 7,  Fury: 9},
  { y: '7', Wilder: 7,  Fury: 5},
  { y: '8', Wilder: 7,  Fury: 8},
  { y: '9', Wilder: 13,  Fury: 7},
  { y: '10', Wilder: 1,  Fury: 10},
  { y: '11', Wilder: 3,  Fury: 4},
  { y: '12', Wilder: 11,  Fury: 5}

     

    ],
    config = {
      data: punchesLanded,
      xkey: 'y',
      ykeys: ['Wilder', 'Fury'],
      labels: ['Wilder', 'Fury'],
      fillOpacity: 0.6,
      hideHover: 'auto',
      behaveLikeLine: true,
      resize: true,
      pointFillColors:['#ffffff'],
      pointStrokeColors: ['black'],
      lineColors:['red','blue']
  };
config.element = 'area-chart';
Morris.Area(config);




var jabsLanded = [
  { y: "1", Wilder: 1, Fury: 3},
  { y: '2', Wilder: 1, Fury: 3},
  { y: '3', Wilder: 2,  Fury: 7},
  { y: '4', Wilder: 4,  Fury: 4},
  { y: '5', Wilder: 5,  Fury: 6},
  { y: '6', Wilder: 7,  Fury: 8},
  { y: '7', Wilder: 5,  Fury: 2},
  { y: '8', Wilder: 5,  Fury: 5},
  { y: '9', Wilder: 4,  Fury: 2},
  { y: '10', Wilder: 1,  Fury: 2},
  { y: '11', Wilder: 1,  Fury: 2},
  { y: '12', Wilder: 4,  Fury: 2}

     

    ],
    config = {
      data: jabsLanded,
      xkey: 'y',
      ykeys: ['Wilder', 'Fury'],
      labels: ['Wilder', 'Fury'],
      fillOpacity: 0.6,
      hideHover: 'auto',
      behaveLikeLine: true,
      resize: true,
      pointFillColors:['#ffffff'],
      pointStrokeColors: ['black'],
      lineColors:['red','blue']
  };
config.element = 'line-chart';
Morris.Line(config);


var powerPunches = [
  { y: "1", Wilder: 3, Fury: 3},
  { y: '2', Wilder: 2, Fury: 2},
  { y: '3', Wilder: 2,  Fury: 4},
  { y: '4', Wilder: 1,  Fury: 3},
  { y: '5', Wilder: 1,  Fury: 1},
  { y: '6', Wilder: 0,  Fury: 1},
  { y: '7', Wilder: 2,  Fury: 3},
  { y: '8', Wilder: 2,  Fury: 3},
  { y: '9', Wilder: 9,  Fury: 5},
  { y: '10', Wilder: 0,  Fury: 8},
  { y: '11', Wilder: 2,  Fury: 2},
  { y: '12', Wilder: 7,  Fury: 10}

     

    ],
    config = {
      data: powerPunches,
      xkey: 'y',
      ykeys: ['Wilder', 'Fury'],
      labels: ['Wilder', 'Fury'],
      fillOpacity: 0.6,
      hideHover: 'auto',
      behaveLikeLine: true,
      resize: true,
      pointFillColors:['#ffffff'],
      pointStrokeColors: ['black'],
      lineColors:['red','blue']
  };
  config.element = 'line-chart2';
  Morris.Line(config);


//config.element = 'bar-chart';
//Morris.Bar(config);
//config.element = 'stacked';
//config.stacked = true;
//Morris.Bar(config);
Morris.Donut({
  element: 'Wilder',
  data: [
    {label: "Total jabs", value: 40},
    {label: "Power Punches", value: 31}
  ]
});
Morris.Donut({
  element: 'fury',
  data: [
    {label: "Total jabs", value: 46},
    {label: "Power Punches", value: 38}
  ]
});