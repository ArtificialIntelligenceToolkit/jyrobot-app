import {Point, Color, Canvas} from "./utils";
import {Robot} from "./Robot";

export class World {
    public time: number = 0;
    public scale: number = 250;
    public at_x: number = 0;
    public at_y: number = 0;
    public w: number;
    public h: number;
    public robots: Robot[] = [];
    public walls: Point[][] = [];
    public colors: Color[] = [];

    constructor(w: number, h: number) {
        this.time = 0;
        this.w = w;
        this.h = h;
        this.addWall(new Color(128, 0, 128),
                     new Point(0.0, 0.0),
                     new Point(this.w, 0.0));
        this.addWall(new Color(128, 0, 128),
                     new Point(0, 0),
                     new Point(0, this.h));
        this.addWall(new Color(128, 0, 128),
                     new Point(0.0, this.h),
                     new Point(this.w, this.h));
        this.addWall(new Color(128, 0, 128),
                     new Point(this.w, 0.0),
                     new Point(this.w, this.h));
    }

    addBox(x1: number, y1: number, x2: number, y2: number, color: Color) {
	// add to world, scaled
	x1 = x1/this.w * this.w;
	y1 = y1/this.h * this.h;
	x2 = x2/this.w * this.w;
	y2 = y2/this.h * this.h;

	const p1 = new Point(x1, y1);
        const p2 = new Point(x2, y1);
        const p3 = new Point(x2, y2);
        const p4 = new Point(x1, y2);

	this.addWall(color, p1, p2, p2, p3, p3, p4, p4, p1);
    }

    setScale(s: number) {
	// scale the world... > 1 make it bigger
	this.scale = s * 250;
    }

    addWall(c: Color, ...points: Point[]) {
        const wall: Point[] = [];
        this.colors.push(c);
	for (let point of points) {
            wall.push(point);
	}
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
