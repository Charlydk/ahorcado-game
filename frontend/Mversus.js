/*palabra elegida*/
 
    botonEnviarPalabra = document.querySelector(".botonpalabra");
botonEnviarPalabra.addEventListener("click",function (event){
    event.preventDefault();
    rValor = document.querySelector(".ingresapalabra").value.toUpperCase();
    
       if (rValor.length < 4) {
        alert("eligí una palabra de 4 a 8 Letras ");
        rValor = document.querySelector(".ingresapalabra").value = "";
        document.querySelector(".ingresapalabra").focus();
        
    }else {
        document.querySelector(".comenzar").style.display = "inline";
        document.querySelector(".ingresapalabra").style.display = "none";
        document.querySelector(".botonpalabra").style.display = "none";
        document.querySelector(".txtIngP").style.display ="none"

    }

    return rValor;
    
})




/*Separa la palabra en un array*/
function SepararPalabra() {
    separar = rValor.split('');
    console.log(separar);
return separar;
}

/*crear guiones*/
function CrearGuiones() {
    pasaPalabra = SepararPalabra();//elemento global para jugar
    var UniPalabra = pasaPalabra.join("");
          
    for (let i = 0; i < UniPalabra.length; i++) {
        pasaPalabra.splice(i,1,'_ ');
     }
       var separarFinal =pasaPalabra.join("");
        document.querySelector(".guion").value += separarFinal;

return separarFinal
}

function cursorFijo() {
    document.querySelector(".ingresaLetra").focus();
}

/*boton comenzar*/
    var botonComenzar = document.querySelector(".comenzar");
botonComenzar.addEventListener("click",function (event){
    event.preventDefault();
    CrearGuiones();
    document.querySelector(".comenzar").style.display = "none";
    document.querySelector(".reiniciar").style.display = "inline";
    document.querySelector(".ingresaLetra").style.display = "inline";
    document.querySelector(".subirLetra").style.display = "inline"
    document.querySelector(".txtTitH3").style.display = "inline"
    document.querySelector(".txtTitH3").textContent="Ingresa una Letra"
    cursorFijo();
})


/*boton reiniciar*/
var botonreiniciar = document.querySelector(".reiniciar");
botonreiniciar.addEventListener("click", function (event) {
    event.preventDefault();
    alert(" ¿Estas listo? - ingresa una palabra de 4 a 8 caracteres y luego hace click en COMENZAR")
    
    document.querySelector(".guion").value ="";
    cantidadErradas = 0
    document.getElementById("imagen").src="img/ahorcadito_1.png";
    document.querySelector(".reiniciar").style.display = "none";
    document.querySelector(".subirLetra").style.display = "inline";
    document.querySelector(".ingresapalabra").style.display = "inline";
    document.querySelector(".botonpalabra").style.display = "inline";
    document.querySelector(".ingresaLetra").style.display = "none";
    document.querySelector(".subirLetra").style.display = "none"
    document.querySelector(".txtTitH3").style.display = "none"
    rValor = document.querySelector(".ingresapalabra").value = "";
    document.querySelector(".txtIngP").style.display ="block",style="text-align: center ;"


    /* borra contenido de sidebar y reinicia el array contenedor de erradas*/
        letrasErradas.pop();
    while (letrasErradas.length > 0) {
        letrasErradas.pop();
    }
    document.querySelector(".LetrasOut").value = "";
})

cantidadErradas = 0;
cantidadAcertadas = 0
disminuyePalabra = 0;
letrasErradas =[]

/*boton enviar letra*/ 
var botonLetra = document.querySelector(".subirLetra");
botonLetra.addEventListener("click",function(event){
        event.preventDefault();
        
        contenido = document.querySelector(".ingresaLetra").value.toUpperCase(); //esta variable encierra la letra que ingresa el jugador
        
        
    if (contenido ==="") {
        alert("Debe ingrear una letra");
    } else {
        cursorFijo();
        
        var convertirPalabra = rValor.split('');
        ComprobarGuiones = pasaPalabra //elemento global guarda la palabra con sus modificaciones

            
        var contarLetra = 0
                      
                for (let i = 0; i < convertirPalabra.length; i++) {
                    let aux = convertirPalabra[i];
                                  
                    if (aux == contenido) {
                        ComprobarGuiones.splice(i,1,contenido);
                        contarLetra++;

                        }       
                 }
               
            //verifica si al letra ingresada es erronea
                 if (contarLetra == 0) {
                    letrasErradas.push(contenido);
                 }
                  var verificacion = ComprobarGuiones.filter(value => value =='_ ').length
                letrasErradasFinal = letrasErradas.filter((item,index)=>{
                    return letrasErradas.indexOf(item) === index;
                  })
                  document.querySelector(".LetrasOut").value = letrasErradas.join(" ")
                           
                    if (disminuyePalabra == 0) {
        
                        if (convertirPalabra.length == verificacion) {
                            cantidadErradas++;
                         } else if(convertirPalabra.length > verificacion){
                            disminuyePalabra = verificacion;
                            cantidadAcertadas++;
                            } 
                    } else if(disminuyePalabra > 0){
        
                        if(disminuyePalabra == verificacion){
                            disminuyePalabra = verificacion
                            cantidadErradas++;
                                               
                    } else if(disminuyePalabra > 0){
                        disminuyePalabra = verificacion
                        cantidadAcertadas++;
                                          
                    } else(console.log('VERIFICAR'));
        
                    var comprobarFinal = disminuyePalabra
                    }
                    
                    //ingresa la letra en el textarea//
                    document.querySelector(".guion").value = ComprobarGuiones.join("") 
                    
                    //borra la letra en el input//
                    contenido = document.querySelector(".ingresaLetra").value = "";
        
                    switch (cantidadErradas) {
                        case 1:
                            document.getElementById("imagen").src="img/ahorcadito_2.png";
                            break;
                        case 2:
                            document.getElementById("imagen").src="img/ahorcadito_3.png";
                            break;
                        case 3:
                            document.getElementById("imagen").src="img/ahorcadito_4.png";
                            break;
                        case 4:
                            document.getElementById("imagen").src="img/ahorcadito_5.png";
                            break;
                        case 5:
                            document.getElementById("imagen").src="img/ahorcadito_6.png";
                            break;
                        case 6:
                            document.getElementById("imagen").src="img/ahorcadito_7.png";
                            document.querySelector(".subirLetra").style.display = "none"
                            document.querySelector(".ingresaLetra").style.display = "none"
                            document.querySelector(".txtTitH3").textContent="GAME OVER!!   -  La palabra era: "+rValor
                            break;
                    
                        default:
                            break;
                    }
        
        if (comprobarFinal == 0 ) {
            document.getElementById("imagen").src="img/ahorcadito_0.png";
            document.querySelector(".subirLetra").style.display = "none"
            document.querySelector(".ingresaLetra").style.display = "none"
            document.querySelector(".txtTitH3").textContent="GANASTE!!!!!"
        
        }
    } 

       
        
})

