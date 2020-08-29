

function mainCanvas(p) {
    let font;
    p.preload = function() {
        font = p.loadFont('fonts/Roboto-Black.ttf',function(f) {
            CharSettings.pfont = f;
        });
    }
    p.setup=function () {
        p.textFont(font);
        let can = p.createCanvas(window.innerWidth,400);
        updateChars();
        can.id('mainCanvas');
        let fi = p.createFileInput(p.handleFontSelect);
        fi.parent(document.getElementById('inputTarget'));
        setTimeout(CharSettings.setChanged,1000);
    }
    p.handleFontSelect =function(file) {
        CharSettings.font = file;
        CharSettings.fontChanged = true;
        CharSettings.setChanged();
    }

    p.draw=function() {
        if(!CharSettings.settingChanged) {
            return;
        }
        CharSettings.settingChanged = false;
        CharSettings.update();
        if(CharSettings.fontChanged) {
            CharSettings.fontChanged = false;
            p.loadFont(CharSettings.font.data,function(f) {
                p.textFont(f);
                CharSettings.pfont = f;
                CharSettings.setChanged();
            });
        }
        p.background(50);
        var widthTrack = 0;
        var hmax = 0;  

        for(var i = 0; i < CharSettings.charCollection.length; i++) {
            let pg = p.createGraphics(CharSettings.charCollection[i].getIwidth(),CharSettings.charCollection[i].getIheight(),p.P2D);
            pg.textFont(CharSettings.pfont);
            pg.noStroke();
            pg.textAlign(pg.CENTER, pg.CENTER);
            var c = CharSettings.charCollection[i];
            
            pg.background(70,70,70);
            if(c.getIheight() >= hmax) hmax = c.getIheight();
            if(c.active) {
                pg.background(100,50,50);
            }
            pg.textSize(c.getFontSize());
            if(CharSettings.getGlowRadius() > 0) {
                let g = p.createGraphics(CharSettings.charCollection[i].getIwidth(),CharSettings.charCollection[i].getIheight(),p.P2D);
                g.textSize(c.getFontSize());
                g.textFont(CharSettings.pfont);
                g.noStroke();
                g.textAlign(g.CENTER,g.CENTER);
                g.fill(CharSettings.glowColor);
                g.text(c.character,c.getX(),c.getY());
                g.filter(g.BLUR,CharSettings.getGlowRadius());
                pg.image(g,0,0);
                g.remove();
            }
            pg.fill(CharSettings.fontColor);
            pg.text(c.character,c.getX(),c.getY());
            p.image(pg,widthTrack,0);
            widthTrack+=c.getIwidth()+1;
            pg.remove();
        }
        if(p.height != hmax) {
            p.resizeCanvas(p.width,hmax,0);
            CharSettings.setChanged();
        }
    }

    p.mousePressed = function() {
        var widthTrack = 0;
        for(var i = 0; i < CharSettings.charCollection.length; i++) {
            if(p.mouseX > widthTrack && p.mouseX < widthTrack + CharSettings.iwidth && p.mouseY > 0 && p.mouseY < CharSettings.iheight) {
                CharSettings.charCollection[i].activate();
            }
            widthTrack+=CharSettings.iwidth+1;
        }
    }
}
var mc = new p5(mainCanvas,'canvasDiv');


function tempCanvas(p) {
    p.setup = function() {
        let can = p.createCanvas(100,100);
        can.id('hiddenCanvas');
        p.textAlign(p.CENTER, p.CENTER);
        p.textFont(CharSettings.pfont);
    }

    p.updateSize = function(width,height) {
        p.resizeCanvas(width,height,0);
    }

    p.drawChar= function(c) {
        p.resizeCanvas(c.getIwidth(),c.getIheight());
        p.fill(CharSettings.fontColor);
        p.textSize(c.getFontSize());
        let blurR = CharSettings.getGlowRadius();
        if(blurR > 0) {
            let g = p.createGraphics(c.getIwidth(),c.getIheight(),p.P2D);
            g.textSize(c.getFontSize());
            g.textFont(CharSettings.pfont);
            g.noStroke();
            g.textAlign(g.CENTER,g.CENTER);
            g.fill(CharSettings.glowColor);
            g.text(c.character,c.getX(),c.getY());
            g.filter(g.BLUR,blurR);
            p.image(g,0,0);
            g.remove();
        }
        p.text(c.character,c.getX(),c.getY());
    }
}

function recursiveGenerate(zb,i) {
    var c = CharSettings.charCollection[i];
    var pc = new p5(tempCanvas,'hiddenCanvas');
    pc.drawChar(CharSettings.charCollection[i]);
    let canv = document.getElementById('hiddenCanvas');
    canv.toBlob(function(blob) {
        var names = [];
        if(CharSettings.charCollection[i].character == '%'){ 
            if(CharSettings.scoreChecked()) names.push("score-percent");
        } else if (CharSettings.charCollection[i].character == '.') {
            if(CharSettings.scoreChecked()) names.push("score-dot");
        } else if (CharSettings.charCollection[i].character == ',') {
            if(CharSettings.scoreChecked()) names.push("score-comma");
        } else if (CharSettings.charCollection[i].character.toLowerCase() == 'x') {
            if(CharSettings.comboChecked()) names.push("combo-x");
        } else {
            if(CharSettings.scoreChecked()) names.push("score-"+c.character);
            if(CharSettings.defaultChecked()) names.push("default-"+c.character);
            if(CharSettings.comboChecked()) names.push("combo-"+c.character);
        }
        
        for(var j = 0; j < names.length; j++) {
            if(CharSettings.twoXChecked()) {
                names[j] = names[j]+"@2x.png";
            } else {
                names[j] = names[j]+".png";
            }
        }
        
        zb.addMultiple(names,blob);
        pc.remove();
        if(i < CharSettings.charCollection.length-1) {
            recursiveGenerate(zb,i+1);
        } else {
            zb.save();
        }
    });
}

function generatePngs() {
    let zb = new ZipBuilder();
    recursiveGenerate(zb,0);
}

function updateChars() {
    CharSettings.charCollection = new Array();
    var chars = document.getElementById('charField').value;
    for(var i = 0; i < chars.length; i++) {
        CharSettings.charCollection.push(new CharSettings(chars.charAt(i)));
    }
}

class ZipBuilder {
    constructor() {
        this.jz = new JSZip();
    }

    setBlob(blob) {
        this.b = blob;
    }

    addMultiple(names,b) {
        names.forEach(element => {
            this.add(element,b);
        });
    }

    add(name,b) {
        this.setBlob(b);
        this.jz.file(name,this.b);
    }

    save() {            
        this.jz.generateAsync({type:"blob"}).then(
        function(blob) {
            saveAs(blob,"result.zip");
        }, function(err) {
            console.log(err);
        });

    }
}

class CharSettings {
    constructor(_character) {
        this.character = _character;
        this.active = false;
        this.resetMods();
        CharSettings.setChanged();
    }
    static font = null;
    static pfont = null;
    static fontChanged = false;
    static charCollection;
    static settingChanged = true;
    static iheight;
    static iwidth;
    static fontSize;
    static cY;
    static cX;
    static fontColor;
    static glowColor;

    resetMods() {
        this.iheightmod = 0;
        this.iwidthmod = 0;
        this.fontSizemod = 0;
        this.Ymod = 0;
        this.Xmod = 0;
    }

    static update() {
        this.iheight = CharSettings.getHeightSetting();
        this.iwidth  = CharSettings.getWidthSetting();
        this.fontSize = CharSettings.getFontSizeSetting();
        this.cY = CharSettings.getCharYSetting();
        this.cX = CharSettings.getCharXSetting();
        this.fontColor = CharSettings.getFontColorSetting();
        this.glowColor = CharSettings.getGlowColor();
    }

    activate() {
        this.active = !this.active;
        CharSettings.setChanged();
        return this.active;
    }

    getIheight() {
        return CharSettings.iheight+this.iheightmod;
    }

    getIwidth() {
        return CharSettings.iwidth+this.iwidthmod;
    }

    getFontSize() {
        return CharSettings.fontSize+this.fontSizemod;
    }

    getY() {
        return CharSettings.cY+this.Ymod;
    }

    getX() {
        return CharSettings.cX+this.Xmod;
    }

    static setChanged() {
        CharSettings.settingChanged = true;
    }

    static decreaseFontSize() {
        for(var i = 0; i < this.charCollection.length; i++) {
            if(this.charCollection[i].active) this.charCollection[i].fontSizemod--;
        }
        CharSettings.settingChanged=true;
    }

    static increaseFontSize() {
        for(var i = 0; i < this.charCollection.length; i++) {
            if(this.charCollection[i].active) this.charCollection[i].fontSizemod++;
        }
        CharSettings.settingChanged=true;
    }

    static resetFontSize() {
        for(var i = 0; i < this.charCollection.length; i++) {
            if(this.charCollection[i].active) this.charCollection[i].fontSizemod = 0;
        }
        CharSettings.settingChanged=true;
    }

    static decreaseIWidth() {
        for(var i = 0; i < this.charCollection.length; i++) {
            if(this.charCollection[i].active) this.charCollection[i].iwidthmod--;
        }
        CharSettings.settingChanged=true;
    }

    static increaseIWidth() {
        for(var i = 0; i < this.charCollection.length; i++) {
            if(this.charCollection[i].active) this.charCollection[i].iwidthmod++;
        }
        CharSettings.settingChanged=true;
    }

    static resetIWidth() {
        for(var i = 0; i < this.charCollection.length; i++) {
            if(this.charCollection[i].active) this.charCollection[i].iwidthmod = 0;
        }
        CharSettings.settingChanged=true;
    }

    static decreaseIHeight() {
        for(var i = 0; i < this.charCollection.length; i++) {
            if(this.charCollection[i].active) this.charCollection[i].iheightmod--;
        }
        CharSettings.settingChanged=true;
    }

    static increaseIHeight() {
        for(var i = 0; i < this.charCollection.length; i++) {
            if(this.charCollection[i].active) this.charCollection[i].iheightmod++;
        }
        CharSettings.settingChanged=true;
    }
    
    static resetIHeight() {
        for(var i = 0; i < this.charCollection.length; i++) {
            if(this.charCollection[i].active) this.charCollection[i].iheightmod = 0;
        }
        CharSettings.settingChanged=true;
    }

    static moveLeft() {
        for(var i = 0; i < this.charCollection.length; i++) {
            if(this.charCollection[i].active) this.charCollection[i].Xmod--;
        }
        CharSettings.settingChanged=true;
    }

    static moveRight() {
        for(var i = 0; i < this.charCollection.length; i++) {
            if(this.charCollection[i].active) this.charCollection[i].Xmod++;
        }
        CharSettings.settingChanged=true;
    }

    static resetX() {
        for(var i = 0; i < this.charCollection.length; i++) {
            if(this.charCollection[i].active) this.charCollection[i].Xmod = 0;
        }
        CharSettings.settingChanged=true;
    }

    static moveUp() {
        for(var i = 0; i < this.charCollection.length; i++) {
            if(this.charCollection[i].active) this.charCollection[i].Ymod--;
        }
        CharSettings.settingChanged=true;
    }

    static moveDown() {
        for(var i = 0; i < this.charCollection.length; i++) {
            if(this.charCollection[i].active) this.charCollection[i].Ymod++;
        }
        CharSettings.settingChanged=true;
    }

    static resetY() {
        for(var i = 0; i < this.charCollection.length; i++) {
            if(this.charCollection[i].active) this.charCollection[i].Ymod = 0;
        }
        CharSettings.settingChanged=true;
    }


    static getHeightSetting() {
        return parseInt(document.getElementById('pngHeight').value);
    }

    static getWidthSetting() {
        return parseInt(document.getElementById('pngWidth').value);
    }

    static getFontSizeSetting() {
        return parseInt(document.getElementById('fontSize').value);
    }

    static getCharYSetting() {
        return parseInt(document.getElementById('charYPos').value);
    }

    static getCharXSetting() {
        return parseInt(document.getElementById('charXPos').value);
    }

    static getFontColorSetting() {
        return document.getElementById('fontColorPicker').value;
    }

    static getGlowRadius() {
        return parseInt(document.getElementById('glowRadius').value);
    }

    static getGlowColor() {
        return document.getElementById('glowColorPicker').value;
    }

    static twoXChecked() {
        return document.getElementById('2xoption').checked;
    }

    static comboChecked() {
        return document.getElementById('comboOption').checked;
    }

    static defaultChecked() {
        return document.getElementById('defaultOption').checked;
    }

    static scoreChecked() {
        return document.getElementById('scoreOption').checked;
    }
}

