var subject = ["My", "All my customers", "My workers", "My customers", "Your"];
var noun = ["linguinis", "face(s)", "lasagna", "restaurant", "outfit(s)"];
var adjective = ["amazing", "atrocious", "beautiful", "supercalifragilisticexpialidocious", "rotten", "the best", "fantastic"];
var sentence = "hi";
var counter = 0;

    
    sentence = subject[Math.floor(Math.random()*subject.length)] + " " + noun[Math.floor(Math.random()*noun.length)] + " is " + adjective[Math.floor(Math.random()*adjective.length)] + ".";

var sentences = ["I didn't become a super saiyan overnight.", sentence];

    getQuote();
    function getQuote(){
        if (counter<100){
    sentence = subject[Math.floor(Math.random()*subject.length)] + " " + noun[Math.floor(Math.random()*noun.length)] + " is " + adjective[Math.floor(Math.random()*adjective.length)] + ".";
    sentences = ["I didn't become a super saiyan overnight.", sentence];
    document.getElementById("quote").innerHTML = sentences[Math.floor(Math.random()*sentences.length)];
    counter +=1;
        }
        else{
            document.getElementById("quote").innerHTML = "Get out of my restaurant you imbecile!";
        }
    }


