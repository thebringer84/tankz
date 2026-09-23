// Three r180 WebGLTextures.updateTexture uses a hardcoded componentStride=4
// when converting update ranges to pixel coordinates, even for RedFormat.
// Express ranges in that coordinate space; GL still reads the single-channel
// source buffer using its actual format. Covered by GPU readback tests.
// Ranges must never cross a row boundary.
export function markTextureRows(texture,indices,width){
 const rows=new Map();for(const i of indices){const row=Math.floor(i/width),x=i%width,b=rows.get(row);if(b){b[0]=Math.min(b[0],x);b[1]=Math.max(b[1],x);}else rows.set(row,[x,x]);}
 for(const [row,[min,max]] of rows)texture.addUpdateRange((row*width+min)*4,(max-min+1)*4);
 if(rows.size)texture.needsUpdate=true;
}
