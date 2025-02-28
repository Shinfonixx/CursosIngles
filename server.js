// Importación de módulos y configuración inicial
const express = require('express');
const path = require('path'); // Para manejar rutas de archivos
const morgan = require('morgan'); // Middleware para logging
const fs = require('fs'); // Sistema de archivos
const mongoose = require('mongoose'); // ORM para MongoDB
const bodyParser = require('body-parser'); // Para analizar datos del formulario
const app = express(); // Inicializa la aplicación Express
const PORT = 3000; // Puerto en el que se ejecutará el servidor
const multer = require('multer');
const User = require('./models/user')
const MongoStore = require('connect-mongo');
// Middleware para analizar datos del formulario (formato URL-encoded)
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// 7 de enero 
//constante para passport y usuarios
const passport = require('passport'); // para autenticar
const LocalStrategy = require('passport-local').Strategy; //para que sea estrategia local 
const session = require('express-session') // para coockies y manejo de sesiones
const bcrypt = require('bcrypt'); // para encriptar contraseñas
const flash = require('connect-flash');// para enviar mensajes flash al navegador
//pasport
passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, async (email, password, done) => {
  try {
    const user = await User.findOne({ email });
    if (!user) {
      await Activity.create({
        email: email,
        lastLogin: null,
        failedAttempts: 1,
        isLoggedIn: false
      });
      return done(null, false, { message: 'El email no está registrado en el sistema' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // Incrementa los intentos fallidos en la actividad del usuario
      let activity = await Activity.findOne({ userId: user._id });
      if (activity) {
        activity.failedAttempts += 1;
        await activity.save();
      } else {
        await Activity.create({
          userId: user._id,
          lastLogin: null,
          failedAttempts: 1,
          isLoggedIn: false
        });
      }
      return done(null, false, { message: 'Contraseña incorrecta' });
    }

    // Si las credenciales son correctas, maneja el estado de sesión
    // Desactiva `isLoggedIn` para todos los demás usuarios
    await Activity.updateMany({}, { $set: { isLoggedIn: false } });

    // Actualiza o crea la actividad para el usuario actual
    let activity = await Activity.findOne({ userId: user._id });
    if (activity) {
      activity.lastLogin = Date.now();
      activity.isLoggedIn = true;
      await activity.save();
    } else {
      await Activity.create({
        userId: user._id,
        lastLogin: Date.now(),
        failedAttempts: 0,
        isLoggedIn: true
      });
    }

    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));
// 8 de enero
// serializacion del usuario, guarda una ID para poder meternos
// y poder acceder a la  info del usuario solo manejando la ID
passport.serializeUser ((user,done) =>{
  done (null, user.id);
})
// deserializacion del usuario, con el ID, lo utiliza para obtener toda la INFO del usuario
//es mas seguro que usar todos los datos
passport.deserializeUser ((async(id,done) =>{
  try{
    const user = await User.findById(id)
    done (null,user)
  } catch (error){
    done(error)
  }
}))





// Middleware de actividad
const updateActivity = async (req, res, next) => {
  if (req.session.userId) {
    try {
      console.log('Actualizando actividad para userId:', req.session.userId);
      let activity = await Activity.findOne({ userId: req.session.userId });
      if (activity) {
        activity.lastLogin = Date.now();
        activity.isLoggedIn = true;
        await activity.save();
        console.log('Actividad actualizada:', activity);
      } else {
        const newActivity = await Activity.create({
          userId: req.session.userId,
          lastLogin: Date.now(),
          isLoggedIn: true
        });
        console.log('Nueva actividad creada:', newActivity);
      }
    } catch (err) {
      console.error('Error al actualizar actividad:', err);
    }
  } else {
    console.log('No se encontró userId en la sesión.');
  }
  next();
};

// En el controlador
const Activity = require('./models/Activity');
const Review = require('./models/Review');
const Course = require('./models/Course');
require('dotenv').config();






// Middleware para hacer `user` disponible en todas las vistas
app.use((req, res, next) => {
  res.locals.user = req.user || null; // Si no hay usuario, pasamos `null`
  next();
});

//middleware para cookies
app.use(session({
  secret: require('crypto').randomBytes(64).toString('hex'),//  //Firma de la sesion de la cookie
  resave: false, //evita que la sesion de guarde soi hay alguna modificacion en la propia sesion
  saveUninitialized: false, // no crea sesion hasta que haya algo que guardar
  rolling:true, //renueva la cookie en cada solicitud
  cookie:{
    maxAge: 1000*60*30 // 30 min de sesion abierta
  }
})) 

// inicializamos passport, session y flash
app.use(passport.initialize());
app.use(passport.session());

app.use(flash())
app.use((req,res,next)=>{
  res.locals.message=req.flash();
  next();
})
//manejar la proteccion de rutas, usado luego en app.get('/basededatos')
//verifica si hay sesion activa y valida
function ensureAuthenticated(req, res, next) {
  console.log('Autenticado:', req.isAuthenticated()); // Verifica si el usuario está autenticado
  if (req.isAuthenticated()) {
    return next(); // si el usuario está autenticado
  }
  res.status(401).render('errorAuth', { title: 'No autenticado', message: 'Debes iniciar sesión para acceder' });
}



//////////////////////////////////////////////
//////////////////////////////////////////////
//////////////////////////////////////////////



// Configuración de conexión a la base de datos MongoDB
const dbURI = 'mongodb+srv://Shinfonixx:Danihr05@clasenode.3zpa9.mongodb.net/TareaFinal';

// Configuración para guardar logs de acceso
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });

// Conexión a MongoDB
mongoose
  .connect(dbURI)
  .then(() => app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`)))
  .catch((error) => console.log('Error de conexión a la BBDD:', error));

// Configuración del motor de plantillas EJS
app.set('view engine', 'ejs'); // Utilizar EJS para renderizar vistas
app.set('views', path.join(__dirname, 'vistas')); // Definir la carpeta para las vistas

// Middleware para servir archivos estáticos (CSS, imágenes, etc.)
// Static file middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));
app.use('/uploads', express.static('uploads')) //



// Middleware para logging de cada solicitud HTTP usando 'morgan'
app.use(morgan('dev', { stream: accessLogStream }));



const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'public', 'uploads')); // Asegúrate de usar una ruta válida
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname); // Obtén la extensión del archivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9); // Genera un sufijo único
    cb(null, `${uniqueSuffix}${ext}`); // Construye el nombre del archivo
  }
});


const upload = multer({ storage });



// --------------------
//RUTAS
// --------------------



// Ruta de la página de inicio (Home)
app.get('/', (req, res) => {
  res.render('index', { 
    user: req.user, 
    title: 'Bienvenido a la plataforma' // Define el título aquí
  });
});

app.get('/about-me', (req, res) => {  // Ruta para redirigir '/about-me' a '/about'
  res.redirect('/about');
});


app.get('/sign-up',(req, res) => {
  res.render('sign-up', { title: 'Crear cuenta' });  // Ruta para crear cuenta
})
// Ruta para manejar el registro
app.post('/sign-up', upload.single('profilePic'), async (req, res) => {
    try {
      const { email, password, name, surname, dob, gender, nationality } = req.body;
  
      console.log("Campos recibidos:", { email, password, name, surname, dob, gender, nationality }); // Verifica aquí
  
      // Verifica que los campos requeridos estén presentes
      if (!password || !name || !surname || !dob || !gender || !nationality) {
        return res.status(400).send('Todos los campos son requeridos');
      }
  
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).send('El usuario ya existe');
      }
  
      const newUser = new User({
        email,
        password,
        name,
        surname,
        dob,
        gender,
        nationality, // Añadido el campo de nacionalidad
        profilePic: req.file ? `/uploads/${req.file.filename}` : null
      });
  
      await newUser.save();
  
      // Crear actividad inicial
      await Activity.create({
        userId: newUser._id,
        lastLogin: Date.now(),
        failedAttempts: 0,
        isLoggedIn: false
      });
  
      res.redirect('/login');
    } catch (error) {
      console.log(error);
      res.status(500).send('Error al crear el usuario');
    }
  });


app.get('/login',(req, res) => {
  res.render('login', { title: 'Iniciar sesion' }); // Ruta para iniciar sesion
})
app.post('/login', passport.authenticate('local', {
  failureRedirect: '/login',
  failureFlash: true
}), async (req, res) => {
  req.session.userId = req.user._id; // Guarda el ID del usuario en la sesión
  await updateActivity(req, res, () => {}); // Actualiza la actividad inmediatamente
  res.redirect('/basededatos');
});

app.get('/user-activity', (req, res) => {
  
  Activity.find()
    .populate('userId') // Para traer la información de usuario
    .then(activities => {
      // Asegúrate de pasar activities a la vista
      res.render('basededatos', { activities });
    })
    .catch(err => console.error(err));
});



app.get('/basededatos', ensureAuthenticated, async (req, res) => {
  try {
    const users = await User.find(); // Obtén los usuarios
    const activities = await Activity.find().populate('userId'); // Obtén las actividades también
    console.log('Actividades obtenidas:', activities); // Verifica qué datos se están obteniendo

    res.render('basededatos', { 
      title: 'Base de Datos de Usuarios',
      user: req.user,
      users,
      activities:activities || [] // Asegúrate de pasar activities aquí
    });
  } catch (error) {
    console.log(error);
    res.status(500).send('Error al cargar los usuarios');
  }
});

app.get ('/logout',(req, res)=>{
  req.logout((error)=>{
    if(error){
      console.log(error)
      return res.status(500).send('error al cerrar sesion')
    }
    res.redirect('/')
  })
})







// Ruta para mostrar el formulario de edición
app.get('/edit-user/:id', async (req, res) => {
  try {
      const user = await User.findById(req.params.id);
      if (!user) {
          return res.status(404).send('Usuario no encontrado');
      }
      res.render('edit-user', { user, title: 'Editar Usuario' }); // Pasa el valor de 'title'
  } catch (error) {
      console.error(error);
      res.status(500).send('Error al cargar el formulario de edición');
  }
});





app.post('/edit-user/:id', upload.single('profilePic'), async (req, res) => {
  try {
    const { name, surname, email, dob, gender } = req.body;

    // Construir el objeto de actualización
    const updateFields = {};
    if (name) updateFields.name = name;
    if (surname) updateFields.surname = surname;
    if (email) updateFields.email = email;
    if (dob) updateFields.dob = new Date(dob);
    if (gender) updateFields.gender = gender;

    // Manejar la nueva foto de perfil si se sube
    if (req.file) {
      updateFields.profilePic = `/uploads/${req.file.filename}`;
    }

    // Actualizar el usuario
    const updatedUser = await User.findByIdAndUpdate(req.params.id, updateFields, { new: true });

    if (!updatedUser) {
      return res.status(404).send('Usuario no encontrado.');
    }

    res.redirect('/basededatos');
  } catch (error) {
    console.error('Error al actualizar el usuario:', error);
    res.status(500).send('Error al actualizar el usuario.');
  }
});




// Ruta para eliminar un usuario
// Update the delete user route
app.delete('/delete-user/:id', ensureAuthenticated, async (req, res) => {
    try {
        console.log('Attempting to delete user:', req.params.id);
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'Usuario no encontrado' 
            });
        }

        // Delete the user
        await User.findByIdAndDelete(req.params.id);
        
        // Delete related activities
        await Activity.deleteMany({ userId: req.params.id });
        
        console.log('User and related activities deleted successfully');
        res.json({ success: true });
        
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al eliminar el usuario' 
        });
    }
});













app.get('/error', (req, res) => {
  res.render('errorAuth', { 
    title: 'Error de autenticación', 
    user: req.user
  });
});

const reviewsRouter = require('./routes/reviews');

app.use('/reviews', reviewsRouter);

app.get('/reviews', async (req, res) => {
  try {
    const reviews = await Review.find().populate('author');
    res.render('reviews', { 
      title: 'Student Reviews',
      reviews,
      user: req.user 
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading reviews');
  }
});

app.get('/reviews/new', ensureAuthenticated, (req, res) => {
  res.render('create-review', { 
    title: 'Write a Review',
    user: req.user
  });
});

app.post('/reviews', ensureAuthenticated, upload.single('image'), async (req, res) => {
  try {
    const { title, summary, content, rating } = req.body;
    const review = new Review({
      title,
      summary,
      content,
      rating,
      author: req.user._id,
      image: req.file ? `/uploads/${req.file.filename}` : null
    });
    await review.save();
    res.redirect('/reviews');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error creating review');
  }
});


app.get('/courses', (req, res) => {
  res.render('courses', { 
    title: 'Our English Courses',
    user: req.user
  });
});

const Cart = require('./models/Cart');

// Add to cart route
app.post('/add-to-cart', ensureAuthenticated, async (req, res) => {
  try {
    console.log('Request body:', req.body); // Debug log
    const { courseId, courseName, price } = req.body;
    
    if (!courseId || !courseName || !price) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    let cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
      cart = new Cart({
        userId: req.user._id,
        items: []
      });
    }

    const existingItem = cart.items.find(item => item.courseId === courseId);
    if (existingItem) {
        return res.json({ 
            success: false, 
            message: 'Course already in cart',
            cartCount: cart.items.length
        });
    }

    // Añadir nuevo item al carrito
    cart.items.push({ courseId, courseName, price });
    await cart.save();
    console.log('Cart updated:', cart); // Debug log

    res.json({ 
      success: true, 
      cartCount: cart.items.length,
      message: 'Course added successfully'
    });
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error adding to cart: ' + error.message 
    });
  }
});

app.get('/cart-count', ensureAuthenticated, async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id });
    res.json({ count: cart ? cart.items.length : 0 });
  } catch (error) {
    console.error('Error getting cart count:', error);
    res.json({ count: 0 });
  }
});


app.get('/cart', ensureAuthenticated, async (req, res) => {
    try {
        const cart = await Cart.findOne({ userId: req.user._id });
        res.render('cart', { 
            title: 'Shopping Cart',
            user: req.user,
            cartItems: cart ? cart.items : [],
            PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID
        });
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).send('Error loading cart');
    }
});

app.delete('/remove-from-cart/:courseId', ensureAuthenticated, async (req, res) => {
    try {
        console.log('Delete request received for course:', req.params.courseId);
        const cart = await Cart.findOne({ userId: req.user._id });
        
        if (!cart) {
            console.log('Cart not found');
            return res.status(404).json({ success: false, message: 'Carrito no encontrado' });
        }

        console.log('Current cart items:', cart.items);
        
        const originalLength = cart.items.length;
        cart.items = cart.items.filter(item => item.courseId !== req.params.courseId);
        
        console.log('Updated cart items:', cart.items);
        console.log('Items removed:', originalLength - cart.items.length);

        await cart.save();
        
        res.json({ 
            success: true, 
            message: 'Curso eliminado del carrito',
            cartCount: cart.items.length 
        });
    } catch (error) {
        console.error('Error removing item from cart:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al eliminar del carrito',
            error: error.message 
        });
    }
});

// PayPal configuration
const paypal = require('@paypal/checkout-server-sdk');

// Create PayPal environment
const environment = new paypal.core.SandboxEnvironment(
    process.env.PAYPAL_CLIENT_ID,
    process.env.PAYPAL_CLIENT_SECRET
);
const client = new paypal.core.PayPalHttpClient(environment);

app.post('/create-paypal-order', async (req, res) => {
    try {
        const cart = await Cart.findOne({ userId: req.user._id });
        
        if (!cart || !cart.items || cart.items.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }

        const total = cart.items.reduce((sum, item) => sum + parseFloat(item.price), 0);

        const request = new paypal.orders.OrdersCreateRequest();
        request.requestBody({
            intent: 'CAPTURE',
            purchase_units: [{
                amount: {
                    currency_code: 'EUR',
                    value: total.toFixed(2)
                }
            }]
        });

        const response = await client.execute(request);
        console.log('Order created successfully:', response.result.id);
        
        return res.json({
            orderId: response.result.id
        });
    } catch (error) {
        console.error('PayPal API error:', error);
        return res.status(500).json({ 
            error: 'Error creating PayPal order',
            details: error.message 
        });
    }
});

// Pago exitoso
app.get('/payment-success', ensureAuthenticated, (req, res) => {
    res.render('payment-success', {
        title: 'Pago Exitoso',
        user: req.user,
        viewCss: 'payment-success'
    });
});


app.post('/capture-paypal-order', async (req, res) => {
    try {
        const { orderID } = req.body;
        const request = new paypal.orders.OrdersCaptureRequest(orderID);
        const response = await client.execute(request);
        
        if (response.result.status === 'COMPLETED') {
            await Cart.findOneAndUpdate(
                { userId: req.user._id },
                { $set: { items: [] } }
            );
            return res.json({ 
                status: 'COMPLETED',
                redirectUrl: '/payment-success'
            });
        }

        res.status(400).json({ error: 'Payment not completed' });
    } catch (error) {
        console.error('Error capturing PayPal order:', error);
        res.status(500).json({ error: 'Error processing payment' });
    }
});

app.use((req, res) => {
  res.status(404).render('404', { title: 'Página no encontrada' });
});







app.delete('/remove-from-cart/:courseId', ensureAuthenticated, async (req, res) => {
    try {
        const cart = await Cart.findOne({ userId: req.user._id });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        cart.items = cart.items.filter(item => item.courseId !== req.params.courseId);
        await cart.save();

        res.json({ 
            success: true, 
            message: 'Curso eliminado del carrito',
            cartCount: cart.items.length 
        });
    } catch (error) {
        console.error('Error removing item from cart:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar del carrito' });
    }
});
