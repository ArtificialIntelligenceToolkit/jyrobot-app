import {Vector, Color, Canvas} from "./utils";
import {Robot} from "./Robot";

export class World {
    public time: number = 0;
    public scale: number = 250;
    public at_x: number = 0;
    public at_y: number = 0;
    public w: number;
    public h: number;
    public robots: Robot[] = [];
    public walls: Vector[][] = [];
    public colors: Color[] = [];

    constructor(w: number, h: number) {
        this.time = 0;
        this.w = w;
        this.h = h;
        this.addWall(new Color(128, 0, 128),
                     new Vector(0.0, 0.0),
                     new Vector(this.w, 0.0),
                     new Vector(this.w, 10.0),
                     new Vector(0, 10.0));
        this.addWall(new Color(128, 0, 128),
                     new Vector(0, 0),
                     new Vector(0, this.h),
                     new Vector(10, this.h),
                     new Vector(10, 0));
        this.addWall(new Color(128, 0, 128),
                     new Vector(0.0, this.h - 10.0),
                     new Vector(0.0, this.h),
                     new Vector(this.w, this.h),
                     new Vector(this.w, this.h - 10.0)
                     );
        this.addWall(new Color(128, 0, 128),
                     new Vector(this.w - 10.0, 0.0),
                     new Vector(this.w, 0.0),
                     new Vector(this.w, this.h),
                     new Vector(this.w - 10.0, this.h));
    }

    addBox(x1: number, y1: number, x2: number, y2: number, color: Color) {
	// add to world, scaled
	x1 = x1/this.w * this.w;
	y1 = y1/this.h * this.h;
	x2 = x2/this.w * this.w;
	y2 = y2/this.h * this.h;
	this.addWall(color,
                     new Vector(x1, y1),
                     new Vector(x2, y1),
                     new Vector(x2, y2),
                     new Vector(x1, y2));
    }

    setScale(s: number) {
	// scale the world... > 1 make it bigger
	this.scale = s * 250;
    }

    addWall(c: Color, v1: Vector, v2: Vector, v3: Vector, v4: Vector) {
        const wall: Vector[] = [];
        this.colors.push(c);
        wall.push(v1);
        wall.push(v2);
        wall.push(v3);
        wall.push(v4);
        this.walls.push(wall);
    }

    addRobot(robot: Robot) {
      // scale the robot's position to this world:
      robot.x = robot.x/this.w * this.w;
      robot.y = robot.y/this.h * this.h;
      this.robots.push(robot);
      robot.world = this;
    }

    update(canvas: Canvas) {
        canvas.noStroke();
        canvas.fill(new Color(0, 128, 0));
        canvas.rect(this.at_x, this.at_y, this.w, this.h);
        let count: number = 0;
        for (let wall of this.walls) {
            const c: Color = this.colors[count];
            canvas.fill(c);
            canvas.stroke(c);
            canvas.beginShape();
            for (let v of wall) {
                canvas.vertex(v.x, v.y);
            }
            canvas.endShape();
            count++;
        }
        for (let robot of this.robots) {
            robot.update(canvas);
            robot.draw(canvas);
        }
        this.time = this.time + 0.1;
    }
}
