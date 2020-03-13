// var request = new XMLHttpRequest();
// //firetypes only
// request.open('GET', 'https://pokeapi.co/api/v2/type/fire', true);
// var globalURL = [];
// request.onload = function()
// {
//  var data = JSON.parse(this.response).pokemon;
//  console.log(data);
//  for(var i=0;i<data.length;i++) {
//  console.log(data[i].pokemon.name);
//  console.log("1");
//  //request.open('GET',data[i].pokemon.url, true);
//  globalURL.push(data[i].pokemon.url);
//  }
// }

// request.send();

// setTimeout(function(){
// console.log("2");
// var requestForImg = new XMLHttpRequest;
// for(var i = 0; i < globalURL.length; i++){
//   for (var j = 0; j<50000000;j++){
// var hi = "hi";
//   }
// requestForImg.open('GET', globalURL[i], true );
// requestForImg.onload = function()
// {
//   var data;
//   data = JSON.parse(this.response);
//   for(var i=0;i<data.length;i++) {
//   console.log(data);

//   }
  
// }
// requestForImg.send();



// }}, 5000);

var pokemonData = [];
var pokemonAmount;
function sendReqAndRetr(url, onResponse){
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.onreadystatechange = function() {
    if(xhr.readyState == 4){
    //var listOfPokemon = JSON.parse(this.response).pokemon;
    onResponse(JSON.parse(this.response));
    }
  };
  xhr.send();
}

function onResponse(data){
  console.log(data);
}

function retrieveEachPokemon(listOfPokemon){
  listOfPokemon = listOfPokemon.pokemon;
  pokemonAmount = listOfPokemon.length;
  console.log(listOfPokemon);

  for(var i=0;i<listOfPokemon.length;i++){
    //console.log(listOfPokemon[i].pokemon.name);
    sendReqAndRetr(listOfPokemon[i].pokemon.url,displayPokemon);
  }
}


//https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/ + id + ".png"
var root = document.getElementById("root");
function displayPokemon(data){
  //console.log(data);
  pokemonData.push(data);
  if (pokemonData.length === pokemonAmount){
    idk();
  }
  /*for(var i = 0; i < pokemonData.length; i++){
    
  }*/
  console.log(pokemonData.length)


}

//sort by number
  function sortNumber(a,b) {
        return a - b;
    }
    //sort objects by variable
  function sortObjectsById(a,b) {
        return a["id"] - b["id"];
    }

function idk(){
console.log(pokemonData.length);
console.log(pokemonData);
pokemonData.sort(sortObjectsById);

for(var i = 0; i < pokemonData.length; i++){
 var img = document.createElement('img');
 img.src ="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/" + pokemonData[i].id + ".png";
  //img.src = data.sprites.front_default;
  img.className = "img";
  var cardLink = document.createElement("a");
  cardLink.className = "cardLink";
  cardLink.href = "http://pokemon.wikia.com/wiki/" + pokemonData[i].name;
 var cardo = document.createElement("div");
 var textCard = document.createElement("h3");
 textCard.textContent = pokemonData[i].name;
 textCard.className = "pokemonNames"
 cardo.className = "cardo";
 cardo.appendChild(img);
 cardo.appendChild(textCard);
 cardLink.appendChild(cardo);


  root.appendChild(cardLink);
}
}
//var selectType = document.getElementById("pokeTypes");
//var option = document.createElement("SELECT");

var pokeTypes = [ "fire", "water", "poison", "dragon", "ground", "rock", "grass", "dark"];
console.log(pokeTypes);
for(let i = 0; i < pokeTypes.length; i++)
{
  document.getElementById("pokemonTypes").innerHTML += `<option value ="${pokeTypes[i]}">${pokeTypes[i]}</h1>`;
  
 // option.text = pokeTypes[i];

 // console.log(option.name);


  //document.getElementById("pokeTypes").add(option);
 }


 function functionChanges(){
   var x = document.getElementById("pokemonTypes");
  sendReqAndRetr(`https://pokeapi.co/api/v2/type/${x.value}`,retrieveEachPokemon);

 }

  
//setTimeout(idk, 500);


//sendReqAndRetr('https://pokeapi.co/api/v2/type/fire',retrieveEachPokemon);


//arrayTest = sendReqAndRetr('https://pokeapi.co/api/v2/type/',retrieveEachPokemon)
//console.log(arrayTest[name]);



/*
var fireTypeRequest = new XMLHttpRequest();
fireTypeRequest.open('GET', 'https://pokeapi.co/api/v2/pokemon/' + )
//pokemon/name
*/