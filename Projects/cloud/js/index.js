let input = document.getElementById("searchBar");
var inputText = "";
input.addEventListener("keyup", searchFunction, false);
function searchFunction(e){
	inputText = input.value;
	console.log(inputText);

	filteredArray = [];
	for(var i = 0; i < adjectives.length; i++){
		if(adjectives[i].includes(inputText)){
			filteredArray.push(adjectives[i]);
		}
	}

	filteredWords = filteredArray
		.map(function(d,i) {
			//console.log(d);
        	return {text: d, size: -i};
        });
		console.log(filteredArray);
		d3.selectAll("svg").remove();

		ctx.clearRect(0,0, 500, 500);


	d3.layout.cloud()
	.size([cWidth, cHeight])
	.words(filteredWords)
	//.padding(2) // controls
	.rotate(function() { return ~~(Math.random() * 2) * 90; })
	.font(fontName)
	.fontSize(function(d) { return fontScale(d.size) })
	.on("end", draw)
	.start();

	d3.select("svg > *").on("mouseover", function(){return tooltip.style("visibility", "visible");})
.on("mousemove", function(){return tooltip.style("top",
    (d3.event.pageY-10)+"px").style("left",(d3.event.pageX+10)+"px");})
.on("mouseout", function(){return tooltip.style("visibility", "hidden");});

for(let i = 0; i < adjectives.length; i++){
	console.log(	hi = d3.select("g")[0][0].childNodes[i]);
	
	d3.select(hi)
	.on("mouseover", function(){return tooltip.style("visibility", "visible");})
	.on("mousemove", function(){console.log(hi); tooltip.html(teams[i])
		.style("top", (d3.event.pageY-10)+"px").style("left",(d3.event.pageX+10)+"px");})
	.on("mouseout", function(){return tooltip.style("visibility", "hidden");});
	
	}

}
let adjectives  = ['elusive', 'holistic', 'defensive', 'offensive', 'team-player', 'aggressive', 'flashy', 'dunk-kings', 'three-point-kings', 'Percentage-kings', 'dynamic', 'eager',
  'dysfunctional'];
  let teams = ['TEAM 1', 'TEAM 2', 'TEAM 3', 'TEAM 4', 'TEAM 5', 'TEAM 6', 'TEAM 7', 'TEAM 8', 'TEAM 9', 'TEAM 10', 'TEAM 11', 'TEAM 12', 'TEAM 13', 'TEAM 14'];


  var filteredArray = [adjectives.length];
var words = adjectives
		.map(function(d,i) {
			//console.log(d);
        	return {text: d, size: -i};
        });
var filteredWords = adjectives
		.map(function(d,i) {
			//console.log(d);
        	return {text: d, size: -i};
        });


var fontName = "Impact",
	cWidth = 800,
	cHeight = 400,
	svg,
	wCloud,
	bbox,
	ctm,
	bScale,
	bWidth,
	bHeight,
	bMidX,
	bMidY,
	bDeltaX,
	bDeltaY;

var cTemp = document.createElement('canvas'),
	ctx = cTemp.getContext('2d');
	ctx.font = "100px " + fontName;

var fRatio = Math.min(cWidth, cHeight) / ctx.measureText(words[0].text).width,
	fontScale = d3.scale.linear()
		.domain([
			d3.min(words, function(d) { return d.size; }), 
			d3.max(words, function(d) { return d.size; })
		])
		//.range([20,120]),
		.range([50,50]), // tbc
	fill = d3.scale.category20();

d3.layout.cloud()
	.size([cWidth, cHeight])
	.words(words)
	//.padding(2) // controls
	.rotate(function() { return ~~(Math.random() * 2) * 90; })
	.font(fontName)
	.fontSize(function(d) { return fontScale(d.size) })
	.on("end", draw)
	.start();

function draw(words, bounds) {
	// move and scale cloud bounds to canvas
	// bounds = [{x0, y0}, {x1, y1}]
	bWidth = bounds[1].x - bounds[0].x;
	bHeight = bounds[1].y - bounds[0].y;
	bMidX = bounds[0].x + bWidth/2;
	bMidY = bounds[0].y + bHeight/2;
	bDeltaX = cWidth/2 - bounds[0].x + bWidth/2;
	bDeltaY = cHeight/2 - bounds[0].y + bHeight/2;
	bScale = bounds ? Math.min( cWidth / bWidth, cHeight / bHeight) : 1;
	
	console.log(
		"bounds (" + bounds[0].x + 
		", " + bounds[0].y + 
		", " + bounds[1].x + 
		", " + bounds[1].y + 
		"), width " + bWidth +
		", height " + bHeight +
		", mid (" + bMidX +
		", " + bMidY +
		"), delta (" + bDeltaX +
		", " + bDeltaY +
		"), scale " + bScale
	);
	
	// the library's bounds seem not to correspond to reality?
	// try using .getBBox() instead?
	
	svg = d3.select(".cloud").append("svg")
		.attr("width", cWidth)
		.attr("height", cHeight);
	
	wCloud = svg.append("g")
		//.attr("transform", "translate(" + [bDeltaX, bDeltaY] + ") scale(" + 1 + ")") // nah!
		.attr("transform", "translate(" + [bWidth>>1, bHeight>>1] + ") scale(" + bScale + ")") // nah!
		.selectAll("text")
		.data(words)
		.enter().append("text")
		.style("font-size", function(d) { return d.size + "px"; })
		.style("font-family", fontName)
		.style("fill", function(d, i) { return fill(i); })
		.attr("text-anchor", "middle")
		.transition()
		.duration(5)
		.attr("transform", function(d) {
			return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
		})
		.text(function(d) { return d.text; });
	
	// TO DO: function to find min and max x,y of all words
	// and use it as the group's bbox
	// then do the transformation
	bbox = wCloud.node(0).getBBox();
	//ctm = wCloud.node().getCTM();
	console.log(
		"bbox (x: " + bbox.x + 
		", y: " + bbox.y + 
		", w: " + bbox.width + 
		", h: " + bbox.height + 
		")"
	);
	
};
var tooltip = d3.select("body")
	.append("div")
	.style("position", "absolute")
	.style("z-index", "10")
	.style("visibility", "hidden")
	.style("font-size", "30px")
	.data(words)
	.text("Hi"/*function(d){return d.text}*/);
/*`string text ${teams[1]} string text`*/
for(let i = 0; i < adjectives.length; i++){
console.log(	hi = d3.select("g")[0][0].childNodes[i]);

d3.select(hi)
.on("mouseover", function(){return tooltip.style("visibility", "visible");})
.on("mousemove", function(){console.log(hi); tooltip.html(teams[i])
	.style("top", (d3.event.pageY-10)+"px").style("left",(d3.event.pageX+10)+"px");})
.on("mouseout", function(){return tooltip.style("visibility", "hidden");});

}
console.log(svg);

function sortByFrequency(arr) {
	var f = {};
	arr.forEach(function(i) { f[i] = 0; });
	var u = arr.filter(function(i) { return ++f[i] == 1; });
	return u.sort(function(a, b) { return f[b] - f[a]; });
}
