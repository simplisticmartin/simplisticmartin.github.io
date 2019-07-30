var scroll = window.requestAnimationFrame ||
            function(callback){ window.setTimeout(callback, 1000/60)};

var elementsToShow = document.querySelectorAll('.show-on-scroll');
function loop() {

    elementsToShow.forEach(function (element) {
      if (isElementInViewport(element)) {
        element.classList.add('is-visible');
      } else {
        element.classList.remove('is-visible');
      }
    });
  
    scroll(loop);
  }
  loop();
  function isElementInViewport(el) {
    // special bonus for those using jQuery
    if (typeof jQuery === "function" && el instanceof jQuery) {
      el = el[0];
    }
    var rect = el.getBoundingClientRect();
    return (
      (rect.top <= 0
        && rect.bottom >= 0)
      ||
      (rect.bottom >= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.top <= (window.innerHeight || document.documentElement.clientHeight))
      ||
      (rect.top >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight))
    );
  }
  const callback = function(entries) {
    entries.forEach(entry => {
      entry.target.classList.toggle("is-visible");
    });
  };
  
  const observer = new IntersectionObserver(callback);
  
  const targets = document.querySelectorAll(".show-on-scroll");
  targets.forEach(function(target) {
    observer.observe(target);
  });





  $(document).ready(function(){
    //Take your div into one js variable
    var div = $("#divToShowHide");
    //Take the current position (vertical position from top) of your div in the variable
    var pos = div.position();
    //Now when scroll event trigger do following
    $(window).scroll(function () {
     var windowpos = $(window).scrollTop();
     //Now if you scroll more than 100 pixels vertically change the class to AfterScroll
     // I am taking 100px scroll, you can take whatever you need
     if (windowpos >= (pos.top - 100)) {
       div.addClass("AfterScroll");
     }
     //If scroll is less than 100px, remove the class AfterScroll so that your content will be hidden again 
     else {
       s.removeClass("AfterScroll");
     }
     //Note: If you want the content should be shown always once you scroll and do not want to hide it again when go to top agian, no need to write the else part
   });
  });