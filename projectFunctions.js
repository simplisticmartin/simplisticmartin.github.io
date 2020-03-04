// document.getElementById("timeline").innerHTML += '<div class="timeline-item"> <div class="timeline-icon"> ' +'<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"     width="21px" height="20px" viewBox="0 0 21 20" enable-background="new 0 0 21 20" xml:space="preserve"></svg></div>' + '<div class="timeline-content"><h2>' + quotes[i]["author"] + " --- When I found quote: " + quotes[i]["date"] +' </h2>' +  '<p>' + quotes[i]["quote"] + '</p>' +'<a href="#"' +`onclick='selectQuote(quotes[${i}])'` + '"' +' class="btn">view quote</a></div></div>' ;
//projectsList
/*   <li class="inline">
      <a href="">
       <!-- <div class="in-line-photo show-on-scroll"></div>--->
        <img src="Projects/DNSandwiches/img/GameSprites/sandwich.png" alt="" class="inline-photo show-on-scroll box"> <span class="project-label inphoto-descrip">Decently Nice(Nutty) Sandwiches
-----
        <h6 >Project Date: Jan 2016</h6>
      </span></a>
      ----
      <div class="details">
        <a href="javascript:openModal()"><img src="Projects/DNSandwiches/img/GameSprites/sandwich.png" alt=""></a>
        <div class="text">--------
          <a href="javascript:openModal()"><h3 class="boldness-title">Decently Nice(or Nutty) Sandwiches</h3></a>
          -------
<p class="open-description"><a class="open-description" href="javascript:openModal()" >  Made to understand web Development. Developed around 2016-2017. Contains many features such as a carousel, bootstrapped enhanced website. Simple target chasing game developed with P5.JS. Contains a quote generator. This is to perhaps create a fictious sandwich website. Designed for fun. </a></p>  
      </div></div>
    </li>*/
//let projectElements = document.getElementById("projectz");
//let projectL = "projectLink"
for(let i = 0; i < numberOfProjects; i++) {
    console.log("hi");
    document.getElementById("projectz").innerHTML += `<li class="inline"> <a href=""> <img src="${projectsList[i]["icon"]}" alt="" class="inline-photo show-on-scroll box"> ` + `<span class="project-label inphoto-descrip">${projectsList[i]["projectName"]}` + ` <h6 >Project Date: ${projectsList[i]["date"]}</h6> </span></a>  <div class="details">` + `<a href='javascript:openModalMod(projectsList[${i}])'>` + `<img class="screenShots" src="${projectsList[i]["screenShot"]}" alt=""></a><div class="text"> <a href='javascript:openModalMod(projectsList[${i}])'><h3 class="boldness-title">${projectsList[i]["projectName"]}</h3></a> <p class="open-description"><a class="open-description" href="javascript:openModal()" > ${projectsList[i]["description"]} </a></p>      </div></div>  </li>`;
}

function openModalMod(fullProject) {
    let link = fullProject["projectLink"]
    
    $("#details").html(`${returnPageMod(link)}` + `<button class="block acenter" style=' width:100%";' value="back-up" onclick="closeModal()">Back</button>`);
    
    modal.style.display = "block";
  }
  function returnPageMod(link)
{
	return(`<object type="text/html" class="full-size-object" data=${link}></object>`);
}
$(".projects>li>a").on("click", function(e){
  e.preventDefault();
  var li=$(this).parent(),
      li_height = li.height(),
      details=li.find(".details"), 
      details_height=details.height(),
      new_height=details_height+40; 
  li.toggleClass("current").animate({
    paddingBottom: new_height
  }, { duration: 200, queue: false }).siblings().removeClass("current");
  $(".projects li:not(.current)").animate({
    paddingBottom: '0'
  }, { duration: 200, queue: false }).find(".details").slideUp(200);
  $(".current").find(".details").slideDown(200);
    
});