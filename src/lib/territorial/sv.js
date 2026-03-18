/**
 * El Salvador — official territorial data
 * 14 departamentos with all their municipios
 */
const SV = {
  name: 'El Salvador',
  code: 'SV',
  phonePrefix: '+503',
  phoneLengthAfterPrefix: 8,
  departments: [
    {
      name: 'Ahuachapán',
      municipalities: [
        'Ahuachapán','Apaneca','Atiquizaya','Concepción de Ataco',
        'El Refugio','Guaymango','Jujutla','San Francisco Menéndez',
        'San Lorenzo','San Pedro Puxtla','Tacuba','Turín',
      ],
    },
    {
      name: 'Santa Ana',
      municipalities: [
        'Santa Ana','Candelaria de la Frontera','Chalchuapa','Coatepeque',
        'El Congo','El Porvenir','Masahuat','Metapán',
        'San Antonio Pajonal','San Sebastián Salitrillo','Santa Rosa Guachipilín',
        'Santiago de la Frontera','Texistepeque',
      ],
    },
    {
      name: 'Sonsonate',
      municipalities: [
        'Sonsonate','Acajutla','Armenia','Caluco','Cuisnahuat','Izalco',
        'Juayúa','Nahuizalco','Nahulingo','Salcoatitán','San Antonio del Monte',
        'San Julián','Santa Catarina Masahuat','Santa Isabel Ishuatán',
        'Santo Domingo de Guzmán','Sonzacate',
      ],
    },
    {
      name: 'Chalatenango',
      municipalities: [
        'Chalatenango','Agua Caliente','Arcatao','Azacualpa','Cancasque',
        'Citalá','Comalapa','Concepción Quezaltepeque','Dulce Nombre de María',
        'El Carrizal','El Paraíso','La Laguna','La Palma','La Reina',
        'Las Flores','Las Vueltas','Nombre de Jesús','Nueva Concepción',
        'Nueva Trinidad','Ojos de Agua','Potonico','San Antonio de la Cruz',
        'San Antonio Los Ranchos','San Fernando','San Francisco Lempa',
        'San Francisco Morazán','San Ignacio','San Isidro Labrador',
        'San Luis del Carmen','San Miguel de Mercedes','San Rafael',
        'Santa Rita','Tejutla',
      ],
    },
    {
      name: 'La Libertad',
      municipalities: [
        'Santa Tecla','Antiguo Cuscatlán','Chiltiupán','Ciudad Arce','Colón',
        'Comasagua','Huizúcar','Jayaque','Jicalapa','La Libertad',
        'Nuevo Cuscatlán','Quezaltepeque','Sacacoyo','San Juan Opico',
        'San Matías','San Pablo Tacachico','Talnique','Tamanique',
        'Teotepeque','Tepecoyo','Zaragoza',
      ],
    },
    {
      name: 'San Salvador',
      municipalities: [
        'San Salvador','Aguilares','Apopa','Ayutuxtepeque','Ciudad Delgado',
        'Cuscatancingo','El Paisnal','Guazapa','Ilopango','Mejicanos',
        'Nejapa','Panchimalco','Rosario de Mora','San Marcos','San Martín',
        'Santiago Texacuangos','Santo Tomás','Soyapango','Tonacatepeque',
      ],
    },
    {
      name: 'Cuscatlán',
      municipalities: [
        'Cojutepeque','Candelaria','El Carmen','El Rosario','Monte San Juan',
        'Oratorio de Concepción','San Bartolomé Perulapía','San Cristóbal',
        'San José Guayabal','San Pedro Perulapán','San Ramón',
        'Santa Cruz Analquito','Santa Cruz Michapa','Suchitoto','Tejutepeque',
      ],
    },
    {
      name: 'La Paz',
      municipalities: [
        'Zacatecoluca','Cuyultitán','El Rosario','Jerusalén',
        'Mercedes La Ceiba','Olocuilta','Paraíso de Osorio',
        'San Antonio Masahuat','San Emigdio','San Francisco Chinameca',
        'San Juan Nonualco','San Juan Talpa','San Juan Tepezontes',
        'San Luis La Herradura','San Luis Talpa','San Miguel Tepezontes',
        'San Pedro Masahuat','San Pedro Nonualco','San Rafael Obrajuelo',
        'Santa María Ostuma','Santiago Nonualco','Tapalhuaca',
      ],
    },
    {
      name: 'Cabañas',
      municipalities: [
        'Sensuntepeque','Cinquera','Dolores','Guacotecti','Ilobasco',
        'Jutiapa','San Isidro','Tejutepeque','Victoria',
      ],
    },
    {
      name: 'San Vicente',
      municipalities: [
        'San Vicente','Apastepeque','Guadalupe','San Cayetano Istepeque',
        'San Esteban Catarina','San Ildefonso','San Lorenzo','San Sebastián',
        'Santa Clara','Santo Domingo','Tecoluca','Tepetitán','Verapaz',
      ],
    },
    {
      name: 'Usulután',
      municipalities: [
        'Usulután','Alegría','Berlín','California','Concepción Batres',
        'El Triunfo','Ereguayquín','Estanzuelas','Jiquilisco','Jucuapa',
        'Jucuarán','Mercedes Umaña','Nueva Granada','Ozatlán',
        'Puerto El Triunfo','San Agustín','San Buenaventura','San Dionisio',
        'San Francisco Javier','Santa Elena','Santa María','Santiago de María',
        'Tecapán',
      ],
    },
    {
      name: 'San Miguel',
      municipalities: [
        'San Miguel','Carolina','Chapeltique','Chinameca','Chirilagua',
        'Ciudad Barrios','Comacarán','El Tránsito','Lolotique','Moncagua',
        'Nueva Guadalupe','Nuevo Edén de San Juan','Quelepa','San Antonio',
        'San Gerardo','San Jorge','San Luis de la Reina','San Rafael Oriente',
        'Sesori','Uluazapa',
      ],
    },
    {
      name: 'Morazán',
      municipalities: [
        'San Francisco Gotera','Arambala','Cacaopera','Chilanga','Corinto',
        'Delicias de Concepción','El Divisadero','El Rosario','Gualococti',
        'Guatajiagua','Joateca','Jocoaitique','Jocoro','Lolotiquillo',
        'Meanguera','Osicala','Perquín','San Carlos','San Fernando',
        'San Isidro','San Simón','Sensembra','Sociedad','Torola',
        'Yamabal','Yoloaiquín',
      ],
    },
    {
      name: 'La Unión',
      municipalities: [
        'La Unión','Anamorós','Bolívar','Concepción de Oriente','Conchagua',
        'El Carmen','El Sauce','Intipucá','Lislique','Meanguera del Golfo',
        'Nueva Esparta','Pasaquina','Polorós','San Alejo','San José',
        'Santa Rosa de Lima','Yayantique','Yucuaiquín',
      ],
    },
  ],
};

export default SV;