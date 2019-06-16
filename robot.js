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
		[0,1190,0,2000],
		[0,2000,0,850],
		[150,2000,0,2000],
		[0,2000,150,2000]
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
	let changedSpeed = true;
	// Initial random scan margin
    let aperture = 2;
    let iterWithoutFind = 0;

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

	async function _shoot_backwards(){
		let baseAngle = movements[curMov] + 135;
		// Randomize angle to avoid infinite loops with other tanks
		baseAngle += (Math.random() - 0.5) * 20;
		await _shoot(baseAngle, 700);
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

	async function _init_strategy(){
        let x = await tank.getX();
        curMov = x < 700 ? 2 : 0;
    }

    // *********************
    // Execution starts here
    // *********************
    await _init_strategy();
	while (true) {

		console.log("Dir=" + curMov + " Speed=" + curSpeed);
		let enemyDistance = await _scan_strategy2();

		// Hemos encontrado a alguien
		if(enemyDistance){
			if(enemyDistance >= min_distance && enemyDistance <= max_distance){
				await _shoot(currentAngle, enemyDistance);
			}
			aperture = 2;
            iterWithoutFind = 0;
		} else {
			aperture+=4;
            iterWithoutFind++;
            if(iterWithoutFind > 3){
                await _shoot_backwards();
            }
        }

		await nextMove();
		await correctTrajectory();
		await setMove();
	}

	async function setMove() {
		if (changedSpeed) {
			console.log("Changed speed")
			await tank.drive(movements[curMov], curSpeed);
			changedSpeed = false;
		}
	}

	async function nextMove(){
		let posX = await tank.getX();
		let posY = await tank.getY();
		while (posX < limit[curMov][0] || posX > limit[curMov][1] || posY < limit[curMov][2] || posY > limit[curMov][3]){
			curMov = (curMov +1)%maxMov;
			changedSpeed = true;
		}
		if (posX < limitSpeed[curMov][0] || posX > limitSpeed[curMov][1] || posY < limitSpeed[curMov][2] || posY > limitSpeed[curMov][3]){
			if (curSpeed !== 100) {
				changedSpeed = true;
				curSpeed = 100;
			}
		} else {
			if (curSpeed !== 45) {
				changedSpeed = true;
				curSpeed = 45;
			}
		}
	}

	async function correctTrajectory(){
		const x = await tank.getX();
		const y = await tank.getY();
		if ( x < 70 || x  > 1270 || y  < 70 || y  > 930){
			changedSpeed = true;
			await tank.drive(0,0);
		}

		if ( x < 70){
			while(await tank.getX() < 70) {
				await tank.drive(0, 50);
			}
		} else if ( x  > 1270){
			while(await tank.getX() < 1270) {
				await tank.drive(180, 50);
			}
		}

		if ( y  < 70){
			while(await tank.getY() < 70) {
				await tank.drive(90, 50);
			}
		} else if ( y  > 930){
			while(await tank.getY() < 930) {
				await tank.drive(270,50);
			}
		}
	}
}