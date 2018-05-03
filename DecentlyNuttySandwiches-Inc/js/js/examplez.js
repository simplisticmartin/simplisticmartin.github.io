/*
Game Objective: Get them apples. Get 12 and win them boi scout of the year boiss

*/

var screenX = 700,  screenY = 600, posX = 20, posY = 20,
sizeX = 100, sizeY = 100, collisionCounter = 0, turn=true, timeout, applescore = 0, timeout2,
sandwich, displaySandwich, apple,  displayApple;
var appleSizeX = 40,  appleSizeY = 40;
var applePosX = 300, applePosY = 100;
var bg;
var menuButtons;



/*

// Position Variables
var x = 0;
var y = 0;
 
// Speed - Velocity
var vx = 0;
var vy = 0;
 
// Acceleration
var ax = 0;
var ay = 0;

var vMultiplier = 0.007;
var bMultiplier = 0.6;*/
 function setup() {
    //menuButtons = new Button[3];
 //	createCanvas(displayWidth, displayHeight);
    createCanvas(screenX, screenY);
 	sandwich = loadImage("../img/GameSprites/sandwich.png");  // 
 	apple = loadImage("../img/GameSprites/apple.png");
 	bg = loadImage("../img/GameSprites/background.jpg")
 //	speedX = 2;
 //	speedY = 2;
  
//	strokeWeight(0);
//	stroke(0);
}
/*
function keyPressed() {
  if (keyCode == UP_ARROW) {
     // image(sandwich );
    //translate(speedX, speedY);
    y2=y2-100;

   //image(sandwich, 20, 20).blend();
   
  } else if (keyCode == DOWN_ARROW) {
      y2=y2+100;
    //displaySandwich;
    //translate(0,10);
    //fillVal = 0;
  }
 
  if (keyIsDown(RIGHT_ARROW)) {
     // image(sandwich );
    //translate(speedX, speedY);
    x2=x2+100;
    
   //image(sandwich, 20, 20).blend();
  }
  if(keyIsDown(LEFT_ARROW))
  {
       x2 = x2 -100;
  }
  }
 // return false; // prevent default
function keyRelease() {
      if (keyCode == UP_ARROW) {
     // image(sandwich );
    //translate(speedX, speedY);
    y2=y2-10;
    
   //image(sandwich, 20, 20).blend();
   
  } else if (keyCode == DOWN_ARROW) {
      y2=y2+10;
    //displaySandwich;
    //translate(0,10);
    //fillVal = 0;
  }
  
}*/

/*function touchMoved() {
  //  image(sandwich, 0 , 0);
    //image(sandwich, 0, 30, 30,30);
    image(sandwich, mouseX, mouseY, pmouseX, pmouseY);
	//line(mouseX, mouseY, pmouseX, pmouseY);
	//return false;
}*/
function draw() {
    
 
    
    
       background(bg);
   // x2 = mouseX;
    //y2= mouseY;
   
    
   
     if (keyIsDown(UP_ARROW)) {
            
            posY -= 10;    
}
     if (keyIsDown(DOWN_ARROW)) {
        
            posY += 10;
         
}
     if (keyIsDown(LEFT_ARROW)) {
         
            posX -= 10;
}
     if (keyIsDown(RIGHT_ARROW)) {
            posX += 10;
}



if(!turn){
    textSize(30);
        fill(150, 0, 0);
        text("Run!", 30, 50);
        
    if(applePosX<posX){
        applePosX += 2;
    }
    if(applePosX>posX){
        applePosX-= 2;
    }
    if(applePosY<posY){
        applePosY += 2;
    }
    if(applePosY>posY){
        applePosY-= 2;
    }
}

    
    displayApple = image(apple, applePosX, applePosY, appleSizeX, appleSizeY);
    displaySandwich = image(sandwich, posX, posY, sizeX, sizeY );
    textSize(12);
     fill(0, 102, 153);
     text("Score: ", 10, screenY - 20);
     text("Apple's Score: " + applescore, screenX - 120, screenY - 20)
     fill(0, 102, 153);
     textSize(12);
     //textSize(12);
    //displaySandwich = image(sandwich, posX, posY, sizeX, sizeY );
    //sandwichMove();
   if (applePosX < posX + sizeX &&
   applePosX + appleSizeX > posX &&
   applePosY < posY + sizeY &&
   appleSizeY + applePosY > posY) {
        if(turn){
            collisionCounter += 1;
            turn = false;
//not working right            clearTimeout(timeout2);
            timeout = setTimeout( function(){
                turn = true;
                }, 10000);
        }
        else{
            applescore+=1;
            turn = true;
            clearTimeout(timeout);
//not working right            timeout2 = setTimeout( function(){
//                turn = false;
//            }, 3000);
        }
        
        applePosX = random(screenX-30);
       applePosY = random(screenY-30);
       
    // collision detected!
}


//if((second()-time)==10){
//    turn = true;
//}
//setTimeout(turn = true, 10000);




textSize(12);
 text(collisionCounter, 47, screenY - 20 );
 textSize(12);

if(collisionCounter >= 12){
    fill('blue');
    textSize(40);
    background(255);
    text("You Win!", screenX/2, screenY/2);
    
    
    
}

    

    
    //image(apple, 1, 1);
    //image(apple, 2, height/3, width, apple.height/3);
     //image(sandwich, 0, 0);
     //image(sandwich, 0, height/2, sandwich.width/2, sandwich.height/2);

  // Displays the image at its actual size at point (0,0)
  
  // Displays the image at point (0, height/2) at half size
  
}





/*
Garbage and Reference Code


   /*
    //Testing Grounds
    background(255);
    if(keyIsDown(SPACE_BAR)){
        
    }
    
    /*function sandwichMove() {

	ax = accelerationX;
	ay = accelerationY;

	vx = vx + ay;
	vy = vy + ax;
	y = y + vy * vMultiplier; 
	x = x + vx * vMultiplier;

	// Bounce when touch the edge of the canvas
	if (x < 0) { 
		x = 0; 
		vx = -vx * bMultiplier; 
	}
 	if (y < 0) { 
 		y = 0; 
 		vy = -vy * bMultiplier; 
 	}
 	if (x > width - 20) { 
 		x = width - 20; 
 		vx = -vx * bMultiplier; 
 	}
 	if (y > height - 20) { 
 		y = height - 20; 
 		vy = -vy * bMultiplier; 
 	}
	
}*/

    
    
    
