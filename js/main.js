import * as THREE from './lib/three.module.js';
import * as gsap from 'gsap'
// import { OrbitControls } from './lib/OrbitControls.js';

class Game {
    constructor () {
        this.Columns = [];
        this.Materials = [];
        this.SlotAngle = 0;
        this.Font = null;
        this.timer = null;
        this.loadRes();
    }
    async loadRes () {
        const TextureNames = ["&", "q", "r", "v", "z"];
        for (let i = 0; i < TextureNames.length; i++) {
            await new Promise( (resolve, reject) => {
                new THREE.TextureLoader().load( `textures/${ TextureNames[i] }_slot.png`,  
                texture => {
                    texture.encoding = THREE.sRGBEncoding;
                    this.Materials.push( new THREE.MeshBasicMaterial( {map: texture, side: THREE.DoubleSide, transparent: true, opacity: 0.5} ) ); 
                    resolve();
                });
            });
        }
        await new Promise((resolve, reject) => {
            new THREE.FontLoader().load('fonts/helvetiker_regular.typeface.json', 
            font => {
                this.Font = font;
                resolve();
            });
        });

        this.Init();
    }

    startRotation () {
        if (this.Columns.reduce((sum, current) => { return sum + current.rolling}, 0) > 0) return;
        this.timer = setTimeout(() => {this.stopRotation()}, 9500);
        for (let i = 0; i < this.Columns.length; i++) {
            
            this.Columns[i].totalTime = 1 + Math.random();
            this.Columns[i].rolling = 1;
            let speed = {value: 0.1}
            gsap.TweenMax.to(speed,  4, {value: 1})
            
            let ColumnRotationX = this.Columns[i].rotation.x;
            this.Columns[i].rotateAnimation = gsap.gsap.fromTo(this.Columns[i].rotation, {x: ColumnRotationX }, 
                {
                    x: ColumnRotationX + (2 * Math.PI + Math.PI/2) , 
                    repeat: -1,
                    duration: speed.value, 
                    ease: "none", 
                    delay: 1 + i * 0.1,
                }
            );
        }
    }
    
    stopRotation () {
        if (this.Columns.reduce((sum, current) => { return sum + current.rolling}, 0) == 0 || this.Columns.reduce((sum, current) => { return sum + current.stopping}, 0) > 0) return;
        clearTimeout(this.timer);
        for (let i = 0; i < this.Columns.length; i++) {
            let totalTime = this.Columns[i].totalTime;
            let currentTime = this.Columns[i].rotateAnimation.time();
            this.Columns[i].stopping = 1; 
            // gsap.gsap.killTweensOf(this.Columns[i].rotation);
            let ColumnRotationX = this.Columns[i].rotation.x;
            gsap.gsap.fromTo(this.Columns[i].rotation, {x: ColumnRotationX } , 
                {
                    x: ColumnRotationX + (((Math.PI/2) - ColumnRotationX) % this.SlotAngle) + this.SlotAngle,
                    ease: "power4.out",
                    duration: (totalTime - currentTime) + 3,
                    delay: 1 + i * 0.1,
                    onComplete: () => {
                        gsap.gsap.killTweensOf(this.Columns[i].rotation);
                        this.Columns[i].rolling = 0;
                        this.Columns[i].stopping = 0;
                    } 
                }
            );
        } 
    }

    Init () {
        let scene = new THREE.Scene();
        let renderer, camera, mobile, controls, mouse;
        mobile = false;
        mouse = new THREE.Vector2();
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|BB|PlayBook|IEMobile|Windows Phone|Kindle|Silk|Opera Mini/i.test(navigator.userAgent)) 
            mobile = true;

        renderer = new THREE.WebGLRenderer({antialias: (mobile) ? false : true});
        camera = new THREE.PerspectiveCamera( 75, (window.innerWidth ) / (window.innerHeight ), 0.1, 120 );

        renderer.setPixelRatio( window.devicePixelRatio );
        renderer.setSize( (window.innerWidth ), (window.innerHeight) );//(window.innerWidth/1.77)
        document.body.appendChild(  renderer.domElement );
        scene.background = new THREE.Color(0xFFFFFF);
        // scene.fog = new THREE.Fog(0xFFFFFF, 10, 250);
        camera.aspect = renderer.domElement.clientWidth / renderer.domElement.clientHeight;
        camera.updateProjectionMatrix();

        scene.add( camera );
        camera.position.set(38.2, -3.54, 144.2);

        // controls = new OrbitControls( camera, renderer.domElement );
        // controls.update();

        const Raycaster = new THREE.Raycaster();
        const ElementsCount = 64;
        const ColumnCount = 5;
        const Radius = 100;
        const PlaneSize = 2 * Radius * Math.tan(Math.PI / ElementsCount);
        const Geometry = new THREE.PlaneGeometry( PlaneSize, PlaneSize, 1, 1 );

        for (let j = 0; j < ColumnCount; j++) {
            let column = new THREE.Group();
            for(let i = 0; i < ElementsCount; i++) {
                let x = Math.cos(2 * Math.PI * i / ElementsCount) * Radius;
                let y = Math.sin(2 * Math.PI * i / ElementsCount) * Radius;
                const plane = new THREE.Mesh( Geometry, this.Materials[THREE.MathUtils.randInt(0, this.Materials.length - 1)] );
                plane.position.set(x, 0, y);
                plane.lookAt(new THREE.Vector3());
                column.add( plane );
            }
            column.position.x = j * PlaneSize;
            column.rotation.set(Math.PI/2, 0, Math.PI/2);
            column.rolling = 0;
            column.stopping = 0;
            this.Columns.push(column);
            scene.add(column);
        }
        this.SlotAngle = this.Columns[0].children[0].position.angleTo(new THREE.Vector3());


        let render = () => {
            renderer.render( scene, camera ); 
            // controls.update();
            requestAnimationFrame( render );
        }

        function onWindowResize () {
            camera.aspect = (window.innerWidth  ) / window.innerHeight ;
            renderer.setPixelRatio( window.devicePixelRatio );
            camera.updateProjectionMatrix();
            renderer.setSize( (window.innerWidth  ), window.innerHeight );
        }
        window.addEventListener( 'resize', onWindowResize, false );



        let CreateButton = (labelText, color, hovercolor, pos) => {
            const TextGeometry = new THREE.TextGeometry( labelText, {
                font: this.Font,
                size: 10,
                height: 1,
                curveSegments: 12,
                bevelEnabled: false
            } );
            TextGeometry.computeBoundingBox(); 
            TextGeometry.translate( - 0.5 * ( TextGeometry.boundingBox.max.x - TextGeometry.boundingBox.min.x), 0, 0 );


            const Button = new THREE.Mesh(TextGeometry, new THREE.MeshBasicMaterial( {color: color} ))
            Button.name = labelText;
            Button.hovercolor = hovercolor;
            Button.defaultcolor = color;
            scene.add(Button);
            Button.position.set(pos.x, pos.y, pos.z);
            return Button;
        }

        const StartButton = CreateButton("Start", 0x000000, 0x708587, new THREE.Vector3(PlaneSize * ColumnCount + 20, 10, Radius), this.startRotation );
        const StopButton = CreateButton("Stop", 0x000000, 0x708587, new THREE.Vector3(PlaneSize * ColumnCount + 20, -20, Radius), this.stopRotation );

        let Interact = action => {
            let inverseMatrix = new THREE.Matrix4(), ray = new THREE.Ray();

            inverseMatrix.getInverse(StartButton.matrixWorld);
            ray.copy(Raycaster.ray).applyMatrix4(inverseMatrix);

            if(ray.intersectsBox(StartButton.geometry.boundingBox) === true){
                if(action == "click") this.startRotation();
                if(action == "hover") StartButton.material.color.setHex(StartButton.hovercolor) ;
            } else {
                StartButton.material.color.setHex(StartButton.defaultcolor);
            } 
            
            inverseMatrix.getInverse(StopButton.matrixWorld);
            ray.copy(Raycaster.ray).applyMatrix4(inverseMatrix);

            if(ray.intersectsBox(StopButton.geometry.boundingBox) === true){
                if(action == "click") this.stopRotation();
                if(action == "hover") StopButton.material.color.setHex(StopButton.hovercolor);
            } else {
                StopButton.material.color.setHex(StopButton.defaultcolor);
            }
        }

        let onMouseClick = () => {
            Interact("click");
        }

        window.addEventListener ('click', onMouseClick, false);

        let onMouseMove = event => {
            Raycaster.setFromCamera( mouse, camera );
            mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
            mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
            Interact("hover");
        }

        window.addEventListener( 'mousemove', onMouseMove, false );

        render();
    }
}

new Game();
