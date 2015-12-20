"use strict";
 
function GetTuplePower(x, y) {
	var right = y, left = y, diff = 0;
 
	right -=  x;
	left +=  x; 

	if (right > 100) {
		diff = right - 100;
	}
	if (left > 100) {
		diff = left - 100;
	}
	if (right < -100) {
		diff = right + 100;
	}
	if (left < -100)
	{
		diff = left + 100;
	}
	right -= diff;
	left -= diff;
	return { "L": left, "R": right };
}
 
console.log(GetTuplePower(-50, 25));