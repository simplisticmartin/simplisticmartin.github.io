$(".profile-pic").click(function() {
  $('#profile_pic_input').trigger('click');
});

function readURL(input) {
  if (input.files && input.files[0]) {
    var reader = new FileReader();
    reader.onload = function(e) {

      //animate profile picture
      var profilePicTL = new TimelineMax();

      profilePicTL
        .set(".profile-pic", {
          transformOrigin: "50% 50%",
        })
        .to(".profile-pic", 2, {
          transform: "rotate(-15deg)",
          ease: Elastic.easeOut
        })
        .to(".profile-pic", .8, {
          transform: "translateY(650px) rotate(20deg)",
          ease: Back.easeIn,
          onComplete: function() {
            $('.profile-pic img').attr('src', e.target.result);
            $('.profile-pic').css('opacity', '0');
          }
        }, "-=1.2")
        .set(".profile-pic", {
          transform: "translateY(-200px) rotate(0)",
          transformOrigin: "50% 50%",
          onComplete: function() {
            $('.profile-pic').css('opacity', '1');
          }
        })
        .to(".profile-pic", .2, {
          transform: "translateY(0)",
          opacity: 1,
          ease: Power2.easeIn
        })
        .set(".profile-pic", {
          transformOrigin: "50% 100%"
        })
        .to(".profile-pic", .1, {
          transform: "scaleX(1.6) scaleY(.3)",
          ease: Power4.easeOut
        })
        .to(".profile-pic", .8, {
          transform: "scaleX(1) scaleY(1)",
          opacity: 1,
          ease: Elastic.easeOut
        });

      //animate card
      var cardTL = new TimelineMax();

      cardTL
        .set(".card", {
          transformOrigin: "100% 100%"
        })
        .to(".card", .7, {
          transform: "rotate(15deg) skew(0)",
          ease: Back.easeOut
        })
        .to(".card", .2, {
          transform: "rotate(-5deg) skewY(-10deg)",
          ease: Back.easeIn
        })
        .to(".card", 1, {
          transform: "rotate(0) skew(0)",
          ease: Elastic.easeOut
        })
        .set(".card", {
          transformOrigin: "50% 100%"
        })
        .to(".card", .2, {
          transform: "scaleX(1.1) scaleY(.9)",
          delay: .9,
          ease: Power4.easeIn
        }, "-=.7")
        .to(".card", .8, {
          transform: "scale(1)",
          ease: Elastic.easeOut
        });
    }
    reader.readAsDataURL(input.files[0]);
  }
}

$("#profile_pic_input").change(function() {
  readURL(this);
});
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
function returnPage()
{
	return('<object type="text/html" class="full-size-object" data="Projects/DNSandwiches/index.html" ></object>');
}




// Get the modal
var modal = document.getElementById("myModal");


// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];

function openModal() {
  $("#details").html(`${returnPage()}` + `<button class="block acenter" style=' width:100%";' value="back-up" onclick="closeModal()">Back</button>`);
  
  modal.style.display = "block";
}


// When the user clicks on <span> (x), close the modal
span.onclick = function() {
  
  modal.style.display = "none";
}

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
}
function closeModal(){
  modal.style.display = "none";
  document.getElementById("details").innerHTML = `<button value='back-up' onclick="closeModal()" style="margin-left:45%; width:10%";>Back to Charts</button>`;
}