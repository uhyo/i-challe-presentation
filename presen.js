window.addEventListener('load',function(){
	var xml;
	var xhr=new XMLHttpRequest();
	xhr.onreadystatechange=function(){
		if(xhr.readyState==4){
			xml=xhr.responseXML;
			callback();
		}
	};
	xhr.open("GET","pre.xml");
	xhr.send(null);

	function callback(){
		var ite=new PresenIterator(xml);
		var pre=new Presen(ite);

		pre.init();
	}
},false);

function Vector(x,y){
	this.x=x,this.y=y;
}

function Presen(ite){
	this.iterator=ite;	//PresenIterator

	this.dragging=null;
	this.style={};
	this.mode="step"
	this.dofx=null;	//どの位置を持っているか
	this.dofy=null;
	
	this.icons1={"part":new Vector(32,0), "img":new Vector(64,0),"delete":new Vector(96,0),"box":new Vector(128,0),"style":new Vector(160,0),"delete-all":new Vector(192,0)};
	this.icons2={"step":new Vector(0,32), "drag":new Vector(32,32), "delete":new Vector(96,0), "input":new Vector(64,32),"style":new Vector(96,32)};
}
Presen.prototype={
	init:function(){
		var t=this;
		this.setinfo();
		document.addEventListener('mousedown',md.bind(this),false);
		document.addEventListener('mousemove',mmv.bind(this),false);
		document.addEventListener('mouseup',mu.bind(this),false);
		//document.addEventListener('keydown',kd.bind(this),false);
		document.addEventListener('keydown',function(e){
			kd.call(t,e);
		},false);
		document.addEventListener('contextmenu',cx.bind(this),false);

		function md(e){
			if(e.button==2){
				if(e.target.classList.contains("part")){
					e.target.style.opacity="0";
					e.target.style.zIndex="1";
					e.target.classList.add("gone");
					setTimeout(function(){
						if(e.target.parentNode){
							e.target.parentNode.removeChild(e.target);
						}
					},1000);
				}
				e.stopPropagation();
				e.preventDefault();
				return;
			}
			switch(this.mode){
			case "step":
				this.iterator.iterate(command.bind(this,e));
				break;
			case "drag":
				if(e.target.classList.contains("part")){
					this.dragging=e.target;
					this.dofx=e.pageX-e.target.offsetLeft;
					this.dofy=e.pageY-e.target.offsetTop;
				}
				break;
			case "delete":
				if(e.target.classList.contains("part")){
					e.target.style.opacity="0";
					e.target.style.zIndex="1";
					e.target.classList.add("gone");
					setTimeout(function(){
						e.target.parentNode.removeChild(e.target);
					},1000);
				}
				break;
			}
			if(this.mode!="link"){
				e.stopPropagation();
				e.preventDefault();
			}
		}
		function mmv(e){
			if(!this.dragging)return;
			var part=this.dragging,s=part.style;
			var px=e.pageX, py=e.pageY;
			s.left=(px-this.dofx)+"px",s.top=(py-this.dofy)+"px";
		}
		function mu(e){
			if(this.dragging && this.dragging.classList.contains("box")){
				//boxは中身を展開する
				this.extractBox(this.dragging);
			}
			this.dragging=null;
		}
		function kd(e){
			if(this.mode=="input" || this.mode=="style")return;
			switch(e.keyCode){
			case 0x5A://Z
				this.modechange("step");
				e.preventDefault();
				break;
			case 0x58://X
				this.modechange("drag");
				e.preventDefault();
				break;
			case 0x43://C
				this.modechange("delete");
				e.preventDefault();
				break;
			case 0x56://V
				this.modechange("link");
				e.preventDefault();
				break;
			case 0x41://A
				this.modechange("input");
				e.preventDefault();
				break;
			case 0x53://S
				this.modechange("style");
				e.preventDefault();
				break;
			}
		}
		function cx(e){
			if(e.target.classList.contains("part")){
				e.preventDefault();
				e.stopPropagation();
			}
		}

		function command(e,node,parent){
			if(!parent)parent=document.body;
			if(node.nodeName=="style"){
				var ps=node.getElementsByTagName("p");
				for(var i=0,l=ps.length;i<l;i++){
					var item=ps.item(i);
					this.style[item.getAttribute('name')]=item.textContent;
				}
			}else if(node.nodeName==="part" || node.nodeName==="img" || node.nodeName==="box" || node.nodeName==="video"){
				//部品
				var part;
				if(node.nodeName==="part"){
					part=document.createElement("div");
					part.textContent=node.textContent;
				}else if(node.nodeName==="img"){
					part=document.createElement("img");
					part.src=node.getAttribute("src");
				}else if(node.nodeName==="box"){
					part=document.createElement("div");
					part.style.width=document.documentElement.clientWidth+"px";
					part.style.height=document.documentElement.clientHeight+"px";
				}else if(node.nodeName==="video"){
					part=document.createElement("video");
					part.src=node.getAttribute("src");
					part.autoplay=true;
					if(node.hasAttribute("width"))part.width=parseInt(node.getAttribute("width"));
					if(node.hasAttribute("height"))part.height=parseInt(node.getAttribute("height"));
					if(node.getAttribute("loop")==="yes")part.loop=true;
				}
				//レベルを決める
				var level=parseInt(node.getAttribute("fixlevel"))||1;
				part.dataset.fixlevel=level;	//boxにつけても効かないかな...

				for(var i in this.style){
					part.style.setProperty(i,this.style[i],"");
				}
				var st=node.getAttribute("style");
				if(st){
					var match;
					while(match=st.match(/^\s*([\w\-]+)\s*:\s*(.+?)(?:;|$)/)){
						part.style.setProperty(match[1],match[2],"");
						st=st.slice(match[0].length);
					}
				}
				switch(node.getAttribute("type")){
				case "left":
					setse(part.style,"transform","translate(-400px,0)");
					break;
				case "right":
					setse(part.style,"transform","translate(400px,0)");
					break;

				default:
				}
				part.style.opacity="0";	//最初は透明

				part.classList.add("part");
				part.classList.add("nodelete");
				parent.appendChild(part);
				if(node.nodeName==="box"){
					for(var i=0,l=node.childNodes.length;i<l;i++){
						if(node.childNodes[i].nodeType===Node.ELEMENT_NODE){
							(command.bind(this))(null,node.childNodes.item(i),part);
						}
					}
					part.classList.add("box");
				}
				part.classList.remove("nodelete");
				
				
				part.style.position="absolute";
				var px=e?e.pageX:0, py=e?e.pageY:0;
				
				//console.log(px,py,part.clientWidth,part.clientHeight,node);
				
				if(node.nodeName=="box"){
					part.style.left=px+"px",part.style.top=py+"px";
				}else{
					part.style.left=(px-part.clientWidth/2)+"px",part.style.top=(py-part.clientHeight/2)+"px";
				}
				
				if(node.getAttribute("x")){
					part.style.left=node.getAttribute("x")+"px";
					part.classList.add("fixed");
				}
				if(node.getAttribute("y")){
					part.style.top=node.getAttribute("y")+"px";
					part.classList.add("fixed");
				}

				

				switch(node.getAttribute("type")){
				case "left":
				case "right":
					setse(part.style,"transition","opacity 0.3s ease-in-out, #{pref}transform 0.3s cubic-bezier(0, 0, 0.7, 1.0)");
					setse(part.style,"transform","translate(0,0)");
					break;

				default:
					setse(part.style,"transition","opacity 0.3s ease-in-out");
				}
				part.style.opacity="1";

				if(!part.classList.contains("fixed")){
					this.dragging=part;
					if(node.nodeName=="box"){
						this.dofx=0,this.dofy=0;
					}else{
						this.dofx=part.clientWidth/2,this.dofy=part.clientHeight/2;
					}
				}else if(part.classList.contains("box")){
					//boxをその場で展開
					this.extractBox(part);
				}

			}else if(node.nodeName=="delete"){
				//消すぞ！
				var t=e.target;
				if(t.classList.contains("part")){
					t.style.opacity="0";
					t.style.zIndex="1";
					t.classList.add("gone");
					setTimeout(function(){
						t.parentNode.removeChild(t);
					},1000);
				}
			}else if(node.nodeName=="delete-all"){
				//全部消す
				var part=document.createElement("div");
				var type=node.getAttribute("type");
				//level(fixlevelがこれより大きいノードは消せない)
				var level=parseInt(node.getAttribute("level")) || 1;
				
				part.classList.add("fixed");
				part.classList.add("deleter");
				
				part.style.position="absolute",part.style.left="0px",part.style.top="0px";
				part.style.width=document.documentElement.clientWidth+"px",part.style.height=document.documentElement.clientHeight+"px";
				switch(type){
				case "turn-right":case "turn-left":
					setse(part.style,"transition","#{pref}transform 0.5s linear");
					setse(part.style,"transform-origin",type=="turn-right"?"right bottom":"left bottom");
					setse(part.style,"transform","rotate(0deg)");
					break;
				case "fade":
					setse(part.style,"transition","opacity 0.5s linear");
					part.style.opacity="1";
					break;
				case "slide-left":case "slide-up":case "slide-right":case "slide-down":
					setse(part.style,"transition","#{pref}transform 0.5s ease-out");
					
				}
				
				var ch=document.body.childNodes;
				for(var i=0,l=ch.length;i<l;i++){
					var n=ch.item(i);
					if(n.classList && n.classList.contains("part") && !n.classList.contains("nodelete")){
						//fixlevel条件
						var lv=parseInt(n.dataset.fixlevel)||1;
						if(lv<=level){
							//消去力が足りる
							//part.appendChild(ch.item((l--,i--)));
							part.appendChild(n);
							l--,i--;
						}
					}
				}
				document.body.appendChild(part);
				//part.style.backgroundColor=document.defaultView.getComputedStyle(document.body,null).backgroundColor;
				//よくわからないけど間を入れる
				setTimeout(function(){
					switch(type){
					case "turn-right":
						setse(part.style,"transform","rotate(90deg)");
						break;
					case "turn-left":
						setse(part.style,"transform","rotate(-90deg)");
						break;
					case "fade":
						part.style.opacity="0";
						break;
					case "slide-left":
						setse(part.style,"transform","translate(-"+part.style.width+",0)");
						break;
					case "slide-up":
						setse(part.style,"transform","translate(0,-"+part.style.height+")");
						break;
					case "slide-right":
						setse(part.style,"transform","translate("+part.style.width+",0)");
						break;
					case "slide-down":
						setse(part.style,"transform","translate(0,"+part.style.height+")");
						break;
					}
				},0);
				setTimeout(function(){
					part.parentNode.removeChild(part);
				},1000);
			}
			this.setinfo();
		}
		function setse(st,prop,value){
			["-webkit-","-moz-","-o-",""].forEach(function(x){
				st.setProperty(x+prop,value.replace("#{pref}",x),"");
			});
		}

	},
	//boxを展開
	extractBox:function(box){
		//座標を手に入れておく
		var ax=parseInt(box.style.left)||0, ay=parseInt(box.style.top)||0;	//"px"除去
		var range=document.createRange();
		range.selectNodeContents(box);	//中身
		var df=range.extractContents();
		var c=df.childNodes;
		for(var i=0,l=c.length;i<l;i++){
			var cc=c[i];
			if(cc.nodeType===Node.ELEMENT_NODE){
				var xx=parseInt(cc.style.left)||0, yy=parseInt(cc.style.top)||0;
				cc.style.left=(ax+xx)+"px", cc.style.top=(ay+yy)+"px";
			}
		}
		//置き換え
		if(box.parentNode){
			box.parentNode.replaceChild(df,box);
		}
		range.detach();
	},
	setinfo:function(){
		if(this.mode=="link"){
			document.getElementById('info').innerHTML="<a href='ch.html' target='_blank'>本体</a> <a href='bf.html' target='_blank'>BF</a>";
			return;
		}else if(this.mode=="input" || this.mode=="style"){
			var info=document.getElementById('info');
			info.textContent=this.mode+" [↑]| ";
			var input=document.createElement("input");
			input.type="text",input.size=40;
			input.addEventListener('keyup',function(e){
				if(e.keyCode==13){
					if(this.mode=="input"){
						var pa=this.iterator.xml.createElement("part");
						pa.textContent=input.value;
						this.iterator.xml.documentElement.insertBefore(pa,this.iterator.xml.documentElement.firstChild);
					}else{
						st=input.value;
						if(st){
							var match;
							while(match=st.match(/^\s*([\w\-]+)\s*:\s*(.+?)(?:;|$)/)){
								this.style[match[1]]=match[2];
								st=st.slice(match[0].length);
							}
						}
					}
					input.value="";
				}else if(e.keyCode==38){
					this.modechange("step");
				}
			}.bind(this),false);
			info.appendChild(input);
			input.focus();
			return;
		}
		//アイコン変更
		var ifm=document.getElementById('info_mode');
		var ifn=document.getElementById('info_next');
		
		ifm.textContent=this.mode;
		var v=this.icons2[this.mode];
		if(!v)v=new Vector(0,0);
		
		ifm.style.backgroundPosition=-v.x+"px -"+v.y+"px";
		
		var ne=this.iterator.next;
		if(!ne){
			v=new Vector(0,0);
		}else{
			v=this.icons1[ne.tagName];
			if(!v){
				v=new Vector(0,0);
			}
			ifn.textContent=ne.tagName;
		}
		ifn.style.backgroundPosition=-v.x+"px -"+v.y+"px";
		
		setinfov(this.iterator.info);
	},
	modechange:function(newmode){
		this.mode=newmode;
		this.setinfo();
	},
};

function PresenIterator(xml){
	this.xml=xml;	//Document
}
PresenIterator.prototype={
	iterate:function(func){
		var first=this.xml.evaluate('/parts/*',this.xml,null,XPathResult.FIRST_ORDERED_NODE_TYPE,null);
		var sn=first.singleNodeValue;
		if(!sn)return;

		this.xml.documentElement.removeChild(sn);//除去
		func(sn);	//コールバック
		if(sn.nodeName=="style"){
			//まだいくぞ！
			this.iterate(func);
		}
	},
	get length(){
		var res=this.xml.evaluate('/parts/*',this.xml,null,XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,null);
		return res.snapshotLength;
	},
	get info(){
		var res=this.xml.evaluate('/parts/*',this.xml,null,XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,null);
		var snl=res.snapshotLength;
		var l=Math.min(snl,7);
		var ret=snl+" steps stack.  ";
		for(var i=0;i<l;i++){
			var item=res.snapshotItem(i);
			ret+=" "+nst(item);
		}
		if(snl>l)ret+="...";
		return ret;
		//ノードから概要文字列
		function nst(node){
			var ret=node.nodeName;
			if(node.nodeName==="part"){
				ret+="("+node.textContent+")";
			}else if(node.nodeName==="box"){
				ret+="(";
				var c=node.childNodes;
				for(var i=0,l=c.length;i<l;i++){
					if(c[i].nodeType===Node.ELEMENT_NODE){
						ret+=" "+nst(c[i]);
					}
				}
				ret+=" )";
			}
			return ret;
		}
	},
	get next(){
		var first=this.xml.evaluate('/parts/*',this.xml,null,XPathResult.FIRST_ORDERED_NODE_TYPE,null);
		var sn=first.singleNodeValue;
		return sn;
	},
};

function setinfov(val){
	document.getElementById('info').textContent=val;
}

