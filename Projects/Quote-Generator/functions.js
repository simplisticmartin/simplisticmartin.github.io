//functions for time line
//let numberOfQuotes = quotes.length
/*
        <div class="timeline-item">
          <div class="timeline-icon">
            <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
     width="21px" height="20px" viewBox="0 0 21 20" enable-background="new 0 0 21 20" xml:space="preserve">
  
  </svg>
  
          </div>
          <div class="timeline-content">
            <h2>LOREM IPSUM DOLOR</h2> ok
            <p>
              Lorem ipsum dolor sit amet, consectetur adipisicing elit. 
              Atque, facilis quo maiores magnam modi ab libero praesentium blanditiis.
            </p>
            <a href="#" class="btn">button</a>
          </div>
        </div>*/

//let timeline = document.getElementsByClassName("timeline");
for(let i = 0; i < numberOfQuotes; i++){
    if(i==0 || i%2 == 0){
    document.getElementById("timeline").innerHTML += '<div class="timeline-item"> <div class="timeline-icon"> ' +'<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"     width="21px" height="20px" viewBox="0 0 21 20" enable-background="new 0 0 21 20" xml:space="preserve"></svg></div>' + '<div class="timeline-content"><h2>' + quotes[i]["author"] + " --- When I found quote: " + quotes[i]["date"] +' </h2>' +  '<p>' + quotes[i]["quote"] + '</p>' +'<a href="#"' +`onclick='selectQuote(quotes[${i}])'` + '"' +' class="btn">view quote</a></div></div>' ;
    }
    else{
        document.getElementById("timeline").innerHTML += '<div class="timeline-item"> <div class="timeline-icon"> ' +'<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"     width="21px" height="20px" viewBox="0 0 21 20" enable-background="new 0 0 21 20" xml:space="preserve"></svg></div>' + '<div class="timeline-content right"><h2>' + quotes[i]["author"] + " --- When I found quote: " + quotes[i]["date"] +' </h2>' +  '<p>' + quotes[i]["quote"] + '</p>' +'<a href="#"' +`onclick='selectQuote(quotes[${i}])'` +  '"' +' class="btn">view quote</a></div></div>' ;
    }
    //document.getElementById("timeline").innerHTML +=
    //document.getElementById("timeline").innerHTML += '';
    //if(i==0 || i%2 == 0){
    //document.getElementById("timeline").innerHTML += ;
    //}
    //else{
    //    document.getElementById("timeline").innerHTML += '<div class="timeline-content right"><h2>' + quotes[i]["author"] + " discovered:" + quotes[i]["date"] +'</h2>';
   // }
    //document.getElementById("timeline").innerHTML += '<p>' + quotes[i]["quote"] + '</p>' +'<a href="#"' +'onclick="' +selectQuote(quotes[i]) + '"' +' class="btn">view quote</a></div></div>'


}


//window.onload = function () 
//{
     //+ String(numberOfQuotes);
   // document.getElementById("picUrl").src = quotes[randomPicker]["picUrl"];
//}

function selectQuote(quote){
    document.getElementById("change-background").style.backgroundImage = `url(${quote["picUrl"]})`;
    let quotation = quote["quote"];
       // let author = document.getElementById('author');
    //var newDom = '';
   // var animationDelay = 10;
    document.getElementById("text").innerHTML = '" ' + quotation + '" -' + ` <a id="author-style" href="${quote["wikiLink"]}" >${quote["author"]}</a>`;
    var newDom = '';
    var animationDelay = 10;

    for(let i = 0; i < text.innerText.length; i++)
    {
        newDom += '<span class="char">' + (text.innerText[i] == ' ' ? '&nbsp;' : text.innerText[i])+ '</span>';
    }

    text.innerHTML = newDom;
    var length = text.children.length;

    for(let i = 0; i < length; i++)
    {
        text.children[i].style['animation-delay'] = animationDelay * i + 'ms';
    }
   // document.getElementById("text").innerHTML = quotation + " " + ` <a href="${quote["wikiLink"]}">${quote["author"]}</a>`;
}