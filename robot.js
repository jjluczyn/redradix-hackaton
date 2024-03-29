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
		baseAngle += (Math.random() - 0.5) * 30;
		await tank.shoot(a(baseAngle), 700);
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
        let y = await tank.getY();

        let izq = x < max_width / 2;
        let arriba = y > max_height / 2;

        if(izq && arriba){
            curMov = 2;
        } else if (izq && !arriba) {
            curMov = 3;
        } else if (!izq && !arriba) {
            curMov = 0;
        } else if (!izq && arriba) {
            curMov = 1;
        }
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
            if(iterWithoutFind > 3 && iterWithoutFind % 2 === 0){
                await _shoot_backwards();
            }
        }

		await nextMove();
		await correctTrajectory();
		await setMove();
	}

	async function setMove() {
		await tank.drive(movements[curMov],curSpeed);
	}

	async function nextMove(){
		let posX = await tank.getX();
		let posY = await tank.getY();
		if(posX > 350 && posX < 1000 && posY > 350 && posY < 650) {
		    // Estamos en el centro, vamos a la pared mas cercana, CORRE PLATANO
            let izq = posX < max_width / 2;
            let arriba = posY > max_height / 2;

            if(izq && arriba){
                curMov = 2;
            } else if (izq && !arriba) {
                curMov = 3;
            } else if (!izq && !arriba) {
                curMov = 0;
            } else if (!izq && arriba) {
                curMov = 1;
            }
        } else {
            while (posX < limit[curMov][0] || posX > limit[curMov][1] || posY < limit[curMov][2] || posY > limit[curMov][3]){
                curMov = (curMov +1)%maxMov;
            }
            if (posX < limitSpeed[curMov][0] || posX > limitSpeed[curMov][1] || posY < limitSpeed[curMov][2] || posY > limitSpeed[curMov][3]){
                curSpeed = 100;
            } else {
                curSpeed = 45;
            }
            //console.log("Moving to "+curMov+" with "+posX+" "+posY);
        }

	}

	async function correctTrajectory(){
		let posX = await tank.getX();
		let posY = await tank.getY();
		while (await tank.getX() < 75){
			await tank.drive(0,0);
			await tank.drive(0,50);
		}
		while (await tank.getX()  > 1250){
			await tank.drive(0,0);
			await tank.drive(180,50);
		}
		while (await tank.getY()  < 75){
			await tank.drive(0,0);
			await tank.drive(90,50);
		}
		while (await tank.getY()  > 910){
			await tank.drive(0,0);
			await tank.drive(270,50);
		}
	}
}