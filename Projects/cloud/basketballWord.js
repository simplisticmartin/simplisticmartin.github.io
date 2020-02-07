let adjectives  = ['elusive', 'holistic', 'defensive', 'offensive', 'team-player', 'aggressive', 'flashy', 'passive-aggressive', 'dunk-kings', 'three-point-kings', 'Percentage-kings',  'dynamic',

  'dysfunctional',

  'eager'];

 

let findMaxPosition = function(arrayInput)

{

    let maxVal = Math.max(...arrayInput);

    let counter = 0;

    
    while(arrayInput[counter] != maxVal)

    {

        counter++;

        console.log("hi");

    }

    console.log("hi");

    return counter;

}
let findMaxValue = function(arrayInput)
{
	return Math.max(...arrayInput);
}
let findTeamNumber = function(arrayInput)
{
	return (findMaxPosition(arrayInput) + 1);
}

//let convertObjToArray

d3.csv("finalData.csv").then(function(data) {

 let maxPositions = [];
 let maxValues = [];

let totalSumFG = new Array(14);

let totalSumFGA = new Array(14);

let totalSumFGPer = new Array(14);

let totalSum3P = new Array(14);

let totalSum3PA = new Array(14);

let totalSum3Per = new Array(14);

let totalSumFT = new Array(14);

let totalSumFTA = new Array(14);

let totalSumFTPer = new Array(14);

let totalSumORB = new Array(14);

let totalSumDRB = new Array(14);

let totalSumTRB = new Array(14);

let totalSumAST = new Array(14);

let totalSumSTL = new Array(14);

let totalSumBLK = new Array(14);

let totalSumTOV = new Array(14);

let totalSumPF = new Array(14);

    //data.forEach(function(d) {

// console.log(data); // [{"Hello": "world"}, …]

//console.log(data[0]);

data.forEach(function(d) {

  

    d["FG"] = parseFloat(d["FG"]);

    d["FGA"] = parseFloat(d["FGA"]);

    d["FG%"] = parseFloat(d["FG%"]);
	d["3P"] = parseFloat(d["3P"]);
	d["3PA"] = parseFloat(d["3PA"]);
	d["3P%"] = parseFloat(d["3P%"]);
	d["FT"] = parseFloat(d["FT"]);
	d["FT%"] = parseFloat(d["FT%"]);
	d["ORB"] = parseFloat(d["ORB"]);
	d["DRB"] = parseFloat(d["DRB"]);
	d["TRB"] = parseFloat(d["TRB"]);
	d["AST"] = parseFloat(d["AST"]);
	d["STL"] = parseFloat(d["STL"]);
	d["BLK"] = parseFloat(d["TOV"]);
	d["PF"] = parseFloat(d["PF"]);

    /*

    totalSumFG[0] = [d3.sum(data.map(function(d){ if(d["TEAM"] == 1) return parseFloat(d["FG"]

     );}))];

     totalSumFG[1] = [d3.sum(data.map(function(d){ if(d["TEAM"] == 2) return parseFloat(d["FG"]

     );}))];*/

//if (d["TEAM"] == 1){

    //console.log("hisok");

   for (let i = 0; i < 14; i++){

 

   let teamNum = i + 1;

     totalSumFG[i] = d3.sum(data.map(function(d){ if(d["TEAM"] == teamNum) return parseFloat(d["FG"]

     );}));

     totalSumFGA[i] = d3.sum(data.map(function(d){ if(d["TEAM"] == teamNum) return parseFloat(d["FGA"]

    );}));

 totalSumFGPer[i] = d3.sum(data.map(function(d){ if(d["TEAM"] == teamNum) return parseFloat(d["FG%"]

);}));
	totalSum3P[i] = d3.sum(data.map(function(d){ if(d["TEAM"] == teamNum) return parseFloat(d["3P"]

);}));
totalSum3PA[i] = d3.sum(data.map(function(d){ if(d["TEAM"] == teamNum) return parseFloat(d["3PA"]

);}));
totalSum3Per[i] = d3.sum(data.map(function(d){ if(d["TEAM"] == teamNum) return parseFloat(d["3P%"]

);}));
totalSumFT[i] = d3.sum(data.map(function(d){ if(d["TEAM"] == teamNum) return parseFloat(d["FT"]

);}));
totalSumFTA[i] = d3.sum(data.map(function(d){ if(d["TEAM"] == teamNum) return parseFloat(d["FTA"]

);}));
totalSumFTPer[i] = d3.sum(data.map(function(d){ if(d["TEAM"] == teamNum) return parseFloat(d["FT%"]

);}));
totalSumORB[i] = d3.sum(data.map(function(d){ if(d["TEAM"] == teamNum) return parseFloat(d["ORB"]

);}));
totalSumDRB[i] = d3.sum(data.map(function(d){ if(d["TEAM"] == teamNum) return parseFloat(d["DRB"]

);}));
totalSumTRB[i] = d3.sum(data.map(function(d){ if(d["TEAM"] == teamNum) return parseFloat(d["TRB"]

);}));
totalSumAST[i] = d3.sum(data.map(function(d){ if(d["TEAM"] == teamNum) return parseFloat(d["AST"]

);}));
totalSumSTL[i] = d3.sum(data.map(function(d){ if(d["TEAM"] == teamNum) return parseFloat(d["STL"]

);}));
totalSumBLK[i] = d3.sum(data.map(function(d){ if(d["TEAM"] == teamNum) return parseFloat(d["BLK"]

);}));
totalSumTOV[i] = d3.sum(data.map(function(d){ if(d["TEAM"] == teamNum) return parseFloat(d["TOV"]

);}));
totalSumPF[i] = d3.sum(data.map(function(d){ if(d["TEAM"] == teamNum) return parseFloat(d["PF"]

);}));

/*

totalSum3P[i] = [d3.sum(data.map(function(d){ if(d["TEAM"] == teamNum) return parseFloat(d["3P"]

);}))];

totalSum3PA[i] = [d3.sum(data.map(function(d){ if(d["TEAM"] == teamNum) return parseFloat(d["FG"]

);}))];

totalSum3Per[i] = [d3.sum(data.map(function(d){ if(d["TEAM"] == teamNum) return parseFloat(d["FG"]

);}))];

let totalSumFT[i] = [d3.sum(data.map(function(d){ if(d["TEAM"] == teamNum) return parseFloat(d["FG"]

);}))];

totalSumFG[i] = [d3.sum(data.map(function(d){ if(d["TEAM"] == teamNum) return parseFloat(d["FG"]

);}))];

totalSumFG[i] = [d3.sum(data.map(function(d){ if(d["TEAM"] == teamNum) return parseFloat(d["FG"]

);}))];

totalSumFG[i] = [d3.sum(data.map(function(d){ if(d["TEAM"] == teamNum) return parseFloat(d["FG"]

);}))];*/

   }

      /* d3.sum(data.map(function(d){ return d.})),

       d3.sum(data.map(function(d){ return d.march}))];

 

    console.log(totalSum);//[4, 9, 12]

*/

 

   

//} 

//

 

    // d["FG"] = parseFloat(d["FG"]);




  });

  console.log("hi");

  console.log(totalSumFG[13]);

  console.log((totalSumFG));

  console.log(array);

 console.log(findMaxPosition(totalSumFG));
 //console.log(Math.max(...totalSumFG));

//  console.log(data[0]);

// console.log(totalSum);

// document.getElementById("textData2").innerHTML = data[0];

});