export class ChessEngine {
    constructor(name = 'Scene1') {
        this.Name = name;
        this.Objects = [];
        this.Mode = null;
        
        this.isActive = false;
        this.Element = null;
    }

    BeginPlay(mode) {
        this.Mode = mode;
        this.isActive = true;

        this.Element = document.createElement('div');
        this.Element.classList.add('scene');
        this.Element.setAttribute('name', this.Name);
        
        document.body.appendChild(this.Element);

        for (const obj of this.Objects) {
            obj.BeginPlay();
        }
    }
    
    Tick(deltaTime) {
        for (const obj of this.Objects) {
            if (obj.isActive) {
                obj.Tick(deltaTime);
            }

            if (obj.Overlap) {
                for (const objB of this.Objects) {
                    if (objB.Overlap && obj !== objB && this.isOverlapping(objB, obj)) {
                        obj.OnOverlap(objB);
                    }
                }
            }
        }
    }

    CreateObject(obj) {
        this.Objects.push(obj);
        obj.Scene = this;
    }

    DestroyObject(dObj) {
        const index = this.Objects.indexOf(dObj);
        if (index !== -1) {
            const obj = this.Objects[index];
            this.Objects.splice(index, 1);
            obj.Destroy();
        }
    }

    Destroy() {
        this.isActive = false;

        // Destroy all objects
        for (const obj of this.Objects) {
            obj.Destroy();
        }
        this.Objects.length = 0;

        // Remove the element from the DOM
        if (this.Element && this.Element.parentNode) {
            this.Element.remove();
        }

        this.Viewport = null;
    }

    isOverlapping(objA, objB) {
        const a = this.getAABBFromRotatedBounds(objA.getBounds());
        const b = this.getAABBFromRotatedBounds(objB.getBounds());

        return !(
            a.x + a.width < b.x ||
            a.x > b.x + b.width ||
            a.y + a.height < b.y ||
            a.y > b.y + b.height
        );
    }

    getAABBFromRotatedBounds(bounds) {
        const xs = bounds.map(p => p.X);
        const ys = bounds.map(p => p.Y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }
}