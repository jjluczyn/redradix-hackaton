async function main(tank) {

	const max_width = 1340;
	const max_height = 1000;

	const center_x = max_width / 2, center_y = max_height / 2;

	// Min and max shoot distance
	const min_distance = 25;
	const max_distance = 700;
	const minAperture = 2;
	const maxAperture = 20;


	// movement vars
	const movements = [0,90,180,270];
	// x < , x > , y < , y > nextCondition
	const limit = [
		[0,1140,0,2000],
		[0,2000,0,820],
		[190,2000,0,2000],
		[0,2000,190,2000]
	];
	const limitSpeed = [
		[1000,2000,0,2000],
		[0,2000,700,2000],
		[0,300,0,2000],
		[0,2000,0,300]
	];
	const maxMov = 4;

	let curMov = 0;
	let curSpeed = 100;
	let currentAngle = 0;
	// end movement vars

	const tankStateData = {
		last: {},
		current: {},
		aperture: 360
	};

	// Prevent angle overflow
	function a(angle){
		return (angle + 360) % 360;
	}

	function d(distance){
		return Math.min(max_distance, distance + 20);
	}

	function getAngle(x1, y1, x2, y2){
		let angle = Math.atan2(y2 - y1, x2 - x1);
		return angle * 360 / 2 / Math.PI;
	}

	async function _shoot(angle, distance){
		//console.log(distance);
		let apertureRange = maxAperture - minAperture;
		let distanceRatio = distance / max_distance;
		let rate = apertureRange * distanceRatio;
		await tank.shoot(a(angle + rate), d(distance));
		await tank.shoot(a(angle - rate), d(distance));
	}

	async function _shoot2(angle, distance){
		await tank.shoot(a(angle + 2.5), d(distance));
		await tank.shoot(a(angle + 7.5), d(distance));
	}

	async function _scan(angle){
		return tank.scan(a(angle + 5), 10);
	}

	async function _scan_strategy1(){
		// Aumentamos la apertura hasta encontrar a alguien
		let variation = Math.random() * tankStateData.aperture * 2 - tankStateData.aperture;
		currentAngle = a(currentAngle + variation);
		return  await _scan(currentAngle);
		//console.log("Variation: " + variation + " Angle: "+ currentAngle);
	}

	async function _scan_strategy2(){
		//let variation = Math.random() * tankStateData.aperture * 2 - tankStateData.aperture;
		currentAngle = getAngle(await tank.getX(), await tank.getY(), center_x, center_y);
		return  await _scan(currentAngle);
		//console.log("Variation: " + variation + " Angle: "+ currentAngle);
	}

	let x = await tank.getX();
	if(x<700)
		curMov = 2;
	else curMov = 0;

	while (true) {

		let enemyDistance = await _scan_strategy2();
		// Hemos encontrado a alguien
		if(enemyDistance){
			if(enemyDistance >= min_distance && enemyDistance <= max_distance){
				await _shoot(currentAngle, enemyDistance);
			}
			tankStateData.aperture = 2;
		} else {
			tankStateData.aperture+=4;
		}

		await nextMove();
		await correctTrajectory();
		await checkForEnemy();
		await setMove();
	}

	async function checkForEnemy(){

	}

	async function setMove() {
		await tank.drive(movements[curMov],curSpeed);
	}

	async function nextMove(){
		let posX = await tank.getX();
		let posY = await tank.getY();
		while (posX < limit[curMov][0] || posX > limit[curMov][1] || posY < limit[curMov][2] || posY > limit[curMov][3]){
			curMov = (curMov +1)%maxMov;
		}
		if (posX < limitSpeed[curMov][0] || posX > limitSpeed[curMov][1] || posY < limitSpeed[curMov][2] || posY > limitSpeed[curMov][3]){
			curSpeed = 100;
		} else {
			curSpeed = 45;
		}
		console.log("Moving to "+curMov+" with "+posX+" "+posY);
	}

	async function correctTrajectory(){
		let posX = await tank.getX();
		let posY = await tank.getY();
		while (await tank.getX() < 75){
			await tank.drive(0,0);
			await tank.drive(0,50);
		}
		if (await tank.getX()  > 1250){
			await tank.drive(0,0);
			await tank.drive(180,50);
		}
		if (await tank.getY()  < 75){
			await tank.drive(0,0);
			await tank.drive(90,50);
		}
		if (await tank.getY()  > 910){
			await tank.drive(0,0);
			await tank.drive(270,50);
		}
	}
}