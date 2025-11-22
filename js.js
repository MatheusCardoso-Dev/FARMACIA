// ============================================
// DEVFARM - Sistema de Funcionalidades
// ============================================

// Estado global do carrinho
let cart = [];
let cartTotal = 0;

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initMenuHamburger();
    initCart();
    initProductButtons();
    initFormValidation();
    initSmoothScroll();
    initScrollAnimations();
    initPhoneMask();
    initHeroButtons();
    initLoginButton();
    loadCartFromStorage();
    // Aguardar um pouco para garantir que o DOM está totalmente carregado
    setTimeout(() => {
        updateCartUI();
        // Verificar scroll inicial
        const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
        if (currentScroll > 300) {
            const floatingBtn = document.getElementById('floatingCartButton');
            if (floatingBtn) {
                const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
                if (totalItems > 0) {
                    floatingBtn.classList.remove('opacity-0', 'invisible', 'translate-y-20');
                    floatingBtn.classList.add('opacity-100', 'visible', 'translate-y-0');
                }
            }
        }
    }, 100);
});

// ============================================
// LOGIN COM GOOGLE
// ============================================
// INSTRUÇÕES PARA CONFIGURAR:
// 1. Acesse https://console.cloud.google.com
// 2. Crie um projeto ou selecione um existente
// 3. Vá em "APIs e Serviços" > "Credenciais"
// 4. Clique em "Criar Credenciais" > "ID do cliente OAuth"
// 5. Configure a tela de consentimento OAuth
// 6. Adicione origens autorizadas (ex: http://localhost, https://seudominio.com)
// 7. Copie o Client ID e cole no campo quando clicar em Login
// 8. Ou defina window.GOOGLE_CLIENT_ID = 'seu-client-id' no console
// ============================================

let googleUser = null;

function initLoginButton() {
    const loginButton = document.getElementById('loginButton');
    const loginButtonText = document.getElementById('loginButtonText');
    const userAvatar = document.getElementById('userAvatar');
    
    if (!loginButton) return;
    
    // Aviso: Google Sign-In não funciona em file:// (mostrar só no clique)
    if (location.protocol === 'file:') {
        console.warn('Google Sign-In não funciona quando a página é aberta via file://');
    }
    
    // Carregar estado do usuário salvo
    loadUserState();
    
    // Inicializar Google Identity Services
    const initGoogleAuth = () => {
        const clientId = getGoogleClientId();
        
        if (typeof google !== 'undefined' && google.accounts && clientId && clientId !== 'YOUR_GOOGLE_CLIENT_ID') {
            try {
                google.accounts.id.initialize({
                    client_id: clientId,
                    callback: window.handleGoogleSignIn,
                    auto_select: false,
                    cancel_on_tap_outside: true
                });
            } catch (e) {
                console.error('Erro ao inicializar Google Auth:', e);
            }
        }
        
        // Verificar se o usuário já está logado
        loadUserState();
    };
    
    // Aguardar Google API carregar
    if (typeof google !== 'undefined') {
        initGoogleAuth();
    } else {
        window.addEventListener('load', () => {
            setTimeout(initGoogleAuth, 1000);
        });
    }
    
    // Event listener para o botão de login
    loginButton.addEventListener('click', (e) => {
        e.preventDefault();
        
        if (googleUser) {
            // Logout
            handleGoogleSignOut();
        } else {
            // Login com Google
            triggerGoogleSignIn();
        }
    });
}

function triggerGoogleSignIn() {
    const clientId = getGoogleClientId();
    if (location.protocol === 'file:') {
        showNotification('Abra o site via http:// (ex.: Live Server) para fazer login com o Google.', 'error');
        return;
    }
    
    if (typeof google !== 'undefined' && google.accounts && clientId && clientId !== 'YOUR_GOOGLE_CLIENT_ID') {
        // Usar Google OAuth2
        const tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid',
            callback: (response) => {
                if (response.access_token) {
                    fetchUserInfo(response.access_token);
                } else if (response.error) {
                    console.error('Erro no login:', response.error);
                    showNotification('Erro ao fazer login. Tente novamente.', 'error');
                }
            },
        });
        tokenClient.requestAccessToken();
    } else {
        // Fallback: usar popup manual
        showGoogleSignInPopup();
    }
}

function showGoogleSignInPopup() {
    // Verificar se o Google API está carregado
    if (typeof google === 'undefined' || !google.accounts) {
        showNotification('Erro ao carregar o serviço de autenticação do Google. Por favor, recarregue a página e tente novamente.', 'error');
        console.error('Google API não carregada');
        return;
    }

    const clientId = getGoogleClientId();
    console.log('Client ID:', clientId); // Log do Client ID
    
    // Se não tivermos um client ID válido, mostrar opções de desenvolvimento
    if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID') {
        console.error('Client ID não configurado ou inválido');
        showDevelopmentLoginOptions();
        return;
    }

    try {
        // Criar o container do popup
        const popupContainer = document.createElement('div');
        popupContainer.id = 'googleSignInPopup';
        popupContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            backdrop-filter: blur(5px);
        `;

        // Criar o conteúdo do popup
        const popupContent = document.createElement('div');
        popupContent.style.cssText = `
            background: white;
            border-radius: 12px;
            width: 100%;
            max-width: 400px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            font-family: 'Google Sans', Roboto, Arial, sans-serif;
        `;

        // Cabeçalho do popup
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 24px 24px 16px;
            text-align: center;
        `;
        
        const title = document.createElement('h2');
        title.textContent = 'Fazer login';
        title.style.cssText = `
            font-size: 20px;
            font-weight: 500;
            color: #202124;
            margin: 0 0 8px 0;
        `;
        
        const subtitle = document.createElement('p');
        subtitle.textContent = 'Selecione a conta com a qual deseja fazer login';
        subtitle.style.cssText = `
            font-size: 15px;
            color: #5f6368;
            margin: 0;
        `;
        
        header.appendChild(title);
        header.appendChild(subtitle);
        
        // Container das contas
        const accountsContainer = document.createElement('div');
        accountsContainer.id = 'googleAccountsContainer';
        accountsContainer.style.cssText = `
            padding: 8px 0;
            max-height: 400px;
            overflow-y: auto;
        `;

        // Rodapé do popup
        const footer = document.createElement('div');
        footer.style.cssText = `
            padding: 16px 24px 24px;
            text-align: center;
            border-top: 1px solid #e0e0e0;
        `;
        
        const addAccountBtn = document.createElement('button');
        addAccountBtn.textContent = 'Usar outra conta';
        addAccountBtn.style.cssText = `
            background: none;
            border: 1px solid #dadce0;
            border-radius: 20px;
            color: #1a73e8;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            height: 40px;
            min-width: 104px;
            outline: none;
            padding: 0 24px;
            transition: background-color 0.2s;
        `;
        
        addAccountBtn.onmouseover = () => {
            addAccountBtn.style.backgroundColor = '#f8f9fa';
        };
        
        addAccountBtn.onmouseout = () => {
            addAccountBtn.style.backgroundColor = 'transparent';
        };
        
        // Adicionar conta de teste para demonstração
        const testAccount = document.createElement('div');
        testAccount.style.cssText = `
            display: flex;
            align-items: center;
            padding: 12px 24px;
            cursor: pointer;
            transition: background-color 0.2s;
        `;
        
        testAccount.onmouseover = () => {
            testAccount.style.backgroundColor = '#f8f9fa';
        };
        
        testAccount.onmouseout = () => {
            testAccount.style.backgroundColor = 'transparent';
        };
        
        testAccount.innerHTML = `
            <div style="width: 40px; height: 40px; border-radius: 20px; background-color: #e8f0fe; 
                        display: flex; align-items: center; justify-content: center; margin-right: 16px;">
                <span style="color: #1a73e8; font-size: 18px; font-weight: 500;">M</span>
            </div>
            <div style="flex: 1; text-align: left;">
                <div style="font-size: 14px; color: #202124;">matheus@gmail.com</div>
                <div style="font-size: 13px; color: #5f6368;">Conta do Google</div>
            </div>
        `;
        
        testAccount.onclick = () => {
            // Simular login com a conta de teste
            const mockUser = {
                email: 'matheus@gmail.com',
                name: 'Matheus',
                picture: '',
                given_name: 'Matheus',
                family_name: 'Usuário',
                sub: '1234567890'
            };
            processGoogleSignIn(mockUser);
            popupContainer.remove();
        };
        
        accountsContainer.appendChild(testAccount);
        
        // Configurar o botão "Usar outra conta"
        addAccountBtn.onclick = () => {
            // Limpar o container de contas
            accountsContainer.innerHTML = '';
            
            // Criar o botão do Google
            const googleButton = document.createElement('div');
            googleButton.id = 'googleSignInButton';
            googleButton.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 12px 24px;
                border: 1px solid #dadce0;
                border-radius: 4px;
                margin: 16px 24px;
                cursor: pointer;
                background: white;
                transition: background-color 0.2s;
            `;
            
            googleButton.onmouseover = () => {
                googleButton.style.backgroundColor = '#f8f9fa';
            };
            
            googleButton.onmouseout = () => {
                googleButton.style.backgroundColor = 'white';
            };
            
            googleButton.innerHTML = `
                <svg width="18" height="18" style="margin-right: 12px;" xmlns="http://www.w3.org/2000/svg">
                    <g fill="#000" fill-rule="evenodd">
                        <path d="M9 3.48c1.69 0 2.83.73 3.48 1.34l2.54-2.48C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l2.91 2.26C4.6 5.05 6.62 3.48 9 3.48z" fill="#EA4335"/>
                        <path d="M17.64 9.2c0-.74-.06-1.28-.19-1.84H9v3.34h4.96c-.21 1.18-.84 2.18-1.79 2.86l2.85 2.2c2.01-1.86 3.17-4.6 3.17-7.56z" fill="#4285F4"/>
                        <path d="M3.88 10.78A5.54 5.54 0 0 1 3.58 9c0-.62.11-1.22.29-1.78L.96 4.96A9.008 9.008 0 0 0 0 9c0 1.45.35 2.82.96 4.04l2.92-2.26z" fill="#FBBC05"/>
                        <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.85-2.2c-.76.53-1.78.9-3.11.9-2.38 0-4.4-1.57-5.12-3.74L.96 13.04C2.45 15.98 5.48 18 9 18z" fill="#34A853"/>
                    </g>
                </svg>
                <span style="color: #3c4043; font-size: 14px; font-weight: 500;">Fazer login com o Google</span>
            `;
            
            googleButton.onclick = (e) => {
                e.stopPropagation();
                initiateGoogleSignIn();
            };
            
            accountsContainer.appendChild(googleButton);
            
            // Adicionar aviso de privacidade
            const privacyText = document.createElement('div');
            privacyText.style.cssText = `
                font-size: 12px;
                color: #5f6368;
                text-align: center;
                padding: 0 24px 16px;
                line-height: 1.4;
            `;
            privacyText.innerHTML = 'Para continuar, o Google compartilhará seu nome, endereço de e-mail e foto de perfil com DevFarm. <a href="#" style="color: #1a73e8; text-decoration: none;">Saiba mais</a>';
            
            accountsContainer.appendChild(privacyText);
        };
        
        footer.appendChild(addAccountBtn);
        
        // Montar o popup
        popupContent.appendChild(header);
        popupContent.appendChild(accountsContainer);
        popupContent.appendChild(footer);
        popupContainer.appendChild(popupContent);
        
        // Adicionar o popup ao documento
        document.body.appendChild(popupContainer);
        
        // Configurar o fechamento do popup ao clicar fora
        popupContainer.onclick = (e) => {
            if (e.target === popupContainer) {
                document.body.removeChild(popupContainer);
            }
        };
        
        // Inicializar o Google Identity Services
        try {
            google.accounts.id.initialize({
                client_id: clientId,
                callback: (response) => {
                    console.log('Resposta do Google:', response);
                    // Remover o popup
                    if (document.body.contains(popupContainer)) {
                        document.body.removeChild(popupContainer);
                    }
                    // Processar a resposta
                    handleGoogleSignIn(response);
                },
                error_callback: (error) => {
                    console.error('Erro na autenticação do Google:', error);
                    showNotification('Erro ao autenticar com o Google: ' + (error.message || 'Erro desconhecido'), 'error');
                },
                auto_select: false,
                cancel_on_tap_outside: true,
                context: 'signin',
                ux_mode: 'popup',
                itp_support: true
            });
        } catch (error) {
            console.error('Erro ao inicializar o Google Sign-In:', error);
            showNotification('Erro ao configurar o login com Google. Verifique o console para mais detalhes.', 'error');
        }
        
    } catch (error) {
        console.error('Erro ao mostrar popup do Google:', error);
        showNotification('Erro ao iniciar autenticação. Tente novamente.', 'error');
    }
}

function initiateGoogleSignIn() {
    const clientId = getGoogleClientId();
    if (location.protocol === 'file:') {
        showNotification('Abra o site via http:// (ex.: Live Server) para fazer login com o Google.', 'error');
        return;
    }
    
    // Verificar se o Google API está carregado
    if (typeof google !== 'undefined' && google.accounts && clientId && clientId !== 'YOUR_GOOGLE_CLIENT_ID') {
        // Usar Google Identity Services para fazer login
        const tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid',
            callback: (response) => {
                if (response.access_token) {
                    fetchUserInfo(response.access_token);
                } else if (response.error) {
                    console.error('Erro no login:', response.error);
                    showNotification('Erro ao fazer login. Tente novamente.', 'error');
                }
            },
        });
        tokenClient.requestAccessToken();
    } else {
        // Modo de desenvolvimento: mostrar opção de login simulado
        showDevelopmentLoginOptions();
    }
}

function getGoogleClientId() {
    // Tentar obter do elemento g_id_onload primeiro
    const gIdElement = document.getElementById('g_id_onload');
    if (gIdElement && gIdElement.dataset.client_id) {
        const clientId = gIdElement.dataset.client_id;
        console.log('Client ID obtido do elemento g_id_onload');
        return clientId;
    }
    
    // Tentar obter de variável global
    if (window.GOOGLE_CLIENT_ID) {
        console.log('Client ID obtido da variável global GOOGLE_CLIENT_ID');
        return window.GOOGLE_CLIENT_ID;
    }
    
    // Tentar obter do localStorage
    const storedClientId = localStorage.getItem('google_client_id');
    if (storedClientId) {
        console.log('Client ID obtido do localStorage');
        return storedClientId;
    }
    
    console.warn('Nenhum Client ID configurado. Usando valor padrão.');
    return 'YOUR_GOOGLE_CLIENT_ID';
}

function showDevelopmentLoginOptions() {
    let popup = document.getElementById('googleLoginPopup');
    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'googleLoginPopup';
        popup.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm';
        const inner = document.createElement('div');
        inner.className = 'bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6';
        popup.appendChild(inner);
        document.body.appendChild(popup);
    }
    const content = popup.querySelector('.bg-white, .dark\:bg-gray-800');
    if (!content) return;
    const currentOrigin = location.origin;
    const savedCid = localStorage.getItem('google_client_id') || '';
    content.innerHTML = `
        <div style="text-align:center">
            <h2 style="font-size:22px;font-weight:800;color:#111827;margin-bottom:12px">Configurar Login Google</h2>
            <p style="font-size:14px;color:#4b5563;margin-bottom:12px">Cole abaixo o Client ID criado no Google Cloud Console.</p>
            <div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:8px;padding:12px;margin-bottom:12px;text-align:left">
                <p style="font-size:12px;color:#92400E;font-weight:600;margin-bottom:6px">Como configurar:</p>
                <ol style="font-size:12px;color:#B45309;padding-left:18px;text-align:left">
                    <li>Acesse <a href="https://console.cloud.google.com" target="_blank" style="text-decoration:underline;color:#1a73e8">Google Cloud Console</a></li>
                    <li>Crie credenciais OAuth 2.0 (Aplicativo da Web)</li>
                    <li>Em <em>Authorized JavaScript origins</em>, adicione <code>${currentOrigin}</code></li>
                    <li>Copie o <strong>Client ID</strong> e cole abaixo</li>
                </ol>
            </div>
            <label for="googleClientIdInput" style="display:block;text-align:left;font-size:12px;color:#374151;margin:6px 0">Client ID</label>
            <div style="margin-bottom:12px">
                <input type="text" id="googleClientIdInput" placeholder="ex.: 1234567890-abcdef.apps.googleusercontent.com" value="${savedCid}" 
                    style="width:100%;padding:10px 12px;border:1px solid #D1D5DB;border-radius:8px;background:#fff;color:#111827;font-size:14px">
            </div>
            <div style="display:flex;gap:8px">
                <button id="saveClientId" style="flex:1;padding:10px 12px;background:#13ec5b;color:#111827;font-weight:700;border:none;border-radius:8px;cursor:pointer">Salvar Client ID</button>
                <button id="testLogin" style="flex:1;padding:10px 12px;background:#E5E7EB;color:#111827;font-weight:700;border:none;border-radius:8px;cursor:pointer">Testar Login</button>
            </div>
            <button id="closeLoginPopup" style="margin-top:12px;font-size:13px;color:#6B7280">Cancelar</button>
        </div>
    `;
    // Foco automático no campo de Client ID e salvar com Enter
    const cidInput = document.getElementById('googleClientIdInput');
    if (cidInput) {
        setTimeout(() => cidInput.focus(), 100);
        cidInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('saveClientId').click();
            }
        });
    }
    // Event listeners
    document.getElementById('saveClientId').addEventListener('click', () => {
        const clientId = document.getElementById('googleClientIdInput').value.trim();
        if (clientId) {
            localStorage.setItem('google_client_id', clientId);
            window.GOOGLE_CLIENT_ID = clientId;
            showNotification('Client ID salvo! Recarregue a página.', 'success');
            setTimeout(() => location.reload(), 1500);
        }
    });
    
    document.getElementById('testLogin').addEventListener('click', () => {
        // Login de teste
        const mockUser = {
            email: 'usuario.teste@gmail.com',
            name: 'Usuário Teste',
            picture: 'https://ui-avatars.com/api/?name=Usuario+Teste&background=13ec5b&color=fff',
            given_name: 'Usuário',
            family_name: 'Teste'
        };
        processGoogleSignIn(mockUser);
        popup.remove();
    });
    
    document.getElementById('closeLoginPopup').addEventListener('click', () => {
        popup.remove();
    });
}

// Callback do Google Sign-In (One Tap ou Credential)
window.handleGoogleSignIn = function(response) {
    if (response.credential) {
        // Decodificar JWT token do One Tap
        try {
            const payload = JSON.parse(atob(response.credential.split('.')[1]));
            const user = {
                email: payload.email,
                name: payload.name,
                picture: payload.picture,
                given_name: payload.given_name,
                family_name: payload.family_name,
                sub: payload.sub
            };
            processGoogleSignIn(user);
        } catch (e) {
            console.error('Erro ao decodificar token:', e);
            showNotification('Erro ao processar login.', 'error');
        }
    } else if (response.email) {
        // Já vem como objeto de usuário
        processGoogleSignIn(response);
    }
};

function fetchUserInfo(accessToken) {
    fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    })
    .then(response => response.json())
    .then(data => {
        const user = {
            email: data.email,
            name: data.name,
            picture: data.picture,
            given_name: data.given_name,
            family_name: data.family_name,
            id: data.id
        };
        processGoogleSignIn(user);
    })
    .catch(error => {
        console.error('Erro ao buscar informações do usuário:', error);
        showNotification('Erro ao fazer login. Tente novamente.', 'error');
    });
}

function processGoogleSignIn(user) {
    googleUser = user;
    
    // Salvar no localStorage
    localStorage.setItem('devfarm_google_user', JSON.stringify(user));
    localStorage.setItem('devfarm_logged_in', 'true');
    
    // Atualizar UI
    updateLoginUI(user);
    
    // Fechar popup se existir
    const popup = document.getElementById('googleLoginPopup');
    if (popup) popup.remove();
    
    showNotification(`Bem-vindo, ${user.name || user.given_name || user.email}!`, 'success');
}

// Alias para compatibilidade
const handleGoogleSignIn = processGoogleSignIn;

function handleGoogleSignOut() {
    // Limpar dados do usuário
    googleUser = null;
    localStorage.removeItem('devfarm_google_user');
    localStorage.removeItem('devfarm_logged_in');
    
    // Fazer logout do Google
    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.disableAutoSelect();
    }
    
    // Atualizar UI
    updateLoginUI(null);
    
    showNotification('Logout realizado com sucesso!', 'success');
}

function updateLoginUI(user) {
    const loginButton = document.getElementById('loginButton');
    const loginButtonText = document.getElementById('loginButtonText');
    const userAvatar = document.getElementById('userAvatar');
    
    if (!loginButton || !loginButtonText) return;
    
    if (user) {
        // Usuário logado
        if (loginButtonText) {
            loginButtonText.textContent = user.given_name || user.name || 'Usuário';
        }
        
        if (userAvatar && user.picture) {
            userAvatar.src = user.picture;
            userAvatar.alt = user.name || 'Avatar';
            userAvatar.classList.remove('hidden');
        }
        
        // Adicionar menu dropdown
        addUserDropdown(user);
    } else {
        // Usuário não logado
        if (loginButtonText) {
            loginButtonText.textContent = 'Login';
        }
        
        if (userAvatar) {
            userAvatar.classList.add('hidden');
        }
        
        // Remover dropdown
        removeUserDropdown();
    }
    
    // Atualizar também o botão mobile
    updateMobileLoginButton();
}

function updateMobileLoginButton() {
    const mobileLoginBtn = document.getElementById('mobileLoginButton');
    const mobileLoginText = document.getElementById('mobileLoginButtonText');
    const mobileAvatar = document.getElementById('mobileUserAvatar');
    
    if (!mobileLoginBtn) return;
    
    if (googleUser) {
        // Usuário logado
        if (mobileLoginText) {
            mobileLoginText.textContent = googleUser.given_name || googleUser.name || 'Usuário';
        }
        
        if (mobileAvatar && googleUser.picture) {
            mobileAvatar.src = googleUser.picture;
            mobileAvatar.alt = googleUser.name || 'Avatar';
            mobileAvatar.classList.remove('hidden');
        }
    } else {
        // Usuário não logado
        if (mobileLoginText) {
            mobileLoginText.textContent = 'Login';
        }
        
        if (mobileAvatar) {
            mobileAvatar.classList.add('hidden');
        }
    }
}

function addUserDropdown(user) {
    // Remover dropdown existente
    removeUserDropdown();
    
    const loginButton = document.getElementById('loginButton');
    if (!loginButton) return;
    
    // Criar dropdown
    const dropdown = document.createElement('div');
    dropdown.id = 'userDropdown';
    dropdown.className = 'absolute top-full right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50 hidden';
    dropdown.innerHTML = `
        <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <p class="text-sm font-medium text-gray-900 dark:text-white">${escapeHtml(user.name || user.email)}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">${escapeHtml(user.email)}</p>
        </div>
        <button id="logoutButton" class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
            <span class="material-symbols-outlined text-lg">logout</span>
            Sair
        </button>
    `;
    
    loginButton.parentElement.style.position = 'relative';
    loginButton.parentElement.appendChild(dropdown);
    
    // Toggle dropdown
    loginButton.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
    });
    
    // Logout
    document.getElementById('logoutButton').addEventListener('click', () => {
        handleGoogleSignOut();
        dropdown.classList.add('hidden');
    });
    
    // Fechar ao clicar fora
    document.addEventListener('click', (e) => {
        if (!loginButton.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });
}

function removeUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) dropdown.remove();
}

function loadUserState() {
    const savedUser = localStorage.getItem('devfarm_google_user');
    if (savedUser) {
        try {
            googleUser = JSON.parse(savedUser);
            updateLoginUI(googleUser);
            updateMobileLoginButton();
        } catch (e) {
            console.error('Erro ao carregar estado do usuário:', e);
        }
    } else {
        updateMobileLoginButton();
    }
}

// ============================================
// MENU HAMBÚRGUER RESPONSIVO
// ============================================
function initMenuHamburger() {
    // Encontrar o botão do menu hambúrguer mobile
    // Procurar por botão que contém o ícone "menu"
    const allButtons = document.querySelectorAll('button');
    let hamburgerBtn = null;
    
    allButtons.forEach(btn => {
        const icon = btn.querySelector('.material-symbols-outlined');
        if (icon && icon.textContent.trim() === 'menu') {
            hamburgerBtn = btn;
        }
    });
    
    if (!hamburgerBtn) return;
    
    // Criar menu mobile
    const mobileMenu = document.createElement('div');
    mobileMenu.className = 'fixed inset-0 z-50 bg-background-light dark:bg-background-dark transform translate-x-full transition-transform duration-300 md:hidden';
    mobileMenu.id = 'mobileMenu';
    mobileMenu.innerHTML = `
        <div class="flex flex-col h-full p-6">
            <div class="flex justify-between items-center mb-8">
                <div class="flex items-center gap-4 text-gray-900 dark:text-white">
                    <div class="text-primary">
                        <svg class="w-8 h-8" fill="none" viewbox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                            <path clip-rule="evenodd" d="M24 18.4228L42 11.475V34.3663C42 34.7796 41.7457 35.1504 41.3601 35.2992L24 42V18.4228Z" fill="currentColor" fill-rule="evenodd"></path>
                            <path clip-rule="evenodd" d="M24 8.18819L33.4123 11.574L24 15.2071L14.5877 11.574L24 8.18819ZM9 15.8487L21 20.4805V37.6263L9 32.9945V15.8487ZM27 37.6263V20.4805L39 15.8487V32.9945L27 37.6263ZM25.354 2.29885C24.4788 1.98402 23.5212 1.98402 22.646 2.29885L4.98454 8.65208C3.7939 9.08038 3 10.2097 3 11.475V34.3663C3 36.0196 4.01719 37.5026 5.55962 38.098L22.9197 44.7987C23.6149 45.0671 24.3851 45.0671 25.0803 44.7987L42.4404 38.098C43.9828 37.5026 45 36.0196 45 34.3663V11.475C45 10.2097 44.2061 9.08038 43.0155 8.65208L25.354 2.29885Z" fill="currentColor" fill-rule="evenodd"></path>
                        </svg>
                    </div>
                    <h2 class="text-xl font-bold">DevFarm</h2>
                </div>
                <button id="closeMobileMenu" class="p-2 text-gray-900 dark:text-white">
                    <span class="material-symbols-outlined text-2xl">close</span>
                </button>
            </div>
            <nav class="flex flex-col gap-4">
                <a href="#" class="text-lg font-medium text-gray-700 dark:text-gray-300 hover:text-primary py-2">Início</a>
                <a href="#produtos" class="text-lg font-medium text-gray-700 dark:text-gray-300 hover:text-primary py-2">Produtos</a>
                <a href="#sobre" class="text-lg font-medium text-gray-700 dark:text-gray-300 hover:text-primary py-2">Sobre</a>
                <a href="#contato" class="text-lg font-medium text-gray-700 dark:text-gray-300 hover:text-primary py-2">Contato</a>
            </nav>
            <div class="mt-auto flex flex-col gap-3">
                <button id="mobileLoginButton" class="flex items-center justify-center gap-2 rounded-lg h-12 px-5 bg-primary text-gray-900 font-bold">
                    <span id="mobileLoginButtonText">Login</span>
                    <img id="mobileUserAvatar" src="" alt="" class="hidden w-6 h-6 rounded-full">
                </button>
                <button id="mobileCartBtn" class="flex items-center justify-center gap-2 rounded-lg h-12 px-5 bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-200">
                    <span class="material-symbols-outlined">shopping_cart</span>
                    <span>Carrinho (<span id="mobileCartCount">0</span>)</span>
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(mobileMenu);
    
    const closeBtn = document.getElementById('closeMobileMenu');
    const mobileCartBtn = document.getElementById('mobileCartBtn');
    const mobileLoginBtn = document.getElementById('mobileLoginButton');
    
    // Abrir menu
    hamburgerBtn.addEventListener('click', () => {
        mobileMenu.classList.remove('translate-x-full');
        document.body.style.overflow = 'hidden';
        // Atualizar estado do botão de login mobile
        updateMobileLoginButton();
    });
    
    // Fechar menu
    closeBtn.addEventListener('click', closeMobileMenu);
    mobileMenu.addEventListener('click', (e) => {
        if (e.target === mobileMenu) closeMobileMenu();
    });
    
    // Fechar ao clicar em links
    mobileMenu.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', closeMobileMenu);
    });
    
    // Login mobile
    if (mobileLoginBtn) {
        mobileLoginBtn.addEventListener('click', () => {
            closeMobileMenu();
            if (googleUser) {
                handleGoogleSignOut();
            } else {
                triggerGoogleSignIn();
            }
        });
    }
    
    // Carrinho mobile
    if (mobileCartBtn) {
        mobileCartBtn.addEventListener('click', () => {
            closeMobileMenu();
            openCart();
        });
    }
    
    function closeMobileMenu() {
        mobileMenu.classList.add('translate-x-full');
        document.body.style.overflow = '';
    }
}

// ============================================
// CARRINHO DE COMPRAS
// ============================================
function initCart() {
    // Encontrar botão do carrinho desktop pelo ID
    const desktopCartBtn = document.getElementById('cartButton');
    
    if (desktopCartBtn) {
        // Adicionar event listener diretamente
        desktopCartBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            openCart();
        });
    } else {
        // Fallback: procurar por ícone shopping_cart
        const allButtons = document.querySelectorAll('button');
        allButtons.forEach(btn => {
            const icon = btn.querySelector('.material-symbols-outlined');
            if (icon && icon.textContent.trim() === 'shopping_cart' && btn.id !== 'floatingCartButton') {
                if (!btn.id) btn.id = 'cartButton';
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    openCart();
                });
            }
        });
    }
    
    // Criar sidebar do carrinho
    createCartSidebar();
    
    // Criar botão flutuante do carrinho
    createFloatingCartButton();
    
    // Adicionar listener de scroll para mostrar/ocultar botão flutuante
    setTimeout(() => {
        initFloatingCartButtonScroll();
    }, 100);
}

function createCartSidebar() {
    const cartSidebar = document.createElement('div');
    cartSidebar.id = 'cartSidebar';
    cartSidebar.className = 'fixed inset-y-0 right-0 z-50 w-full max-w-md bg-background-light dark:bg-background-dark shadow-xl transform translate-x-full transition-transform duration-300';
    cartSidebar.innerHTML = `
        <div class="flex flex-col h-full">
            <div class="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-800 bg-primary">
                <h2 class="text-xl font-bold text-gray-900">Seu Carrinho</h2>
                <button id="closeCart" class="p-2 text-gray-900 hover:bg-black/10 rounded-lg transition-colors">
                    <span class="material-symbols-outlined text-2xl">close</span>
                </button>
            </div>
            <div id="cartItems" class="flex-1 overflow-y-auto p-6">
                <p class="text-center text-gray-600 dark:text-gray-400 py-8">Seu carrinho está vazio</p>
            </div>
            <div class="border-t border-gray-200 dark:border-gray-800 p-6 bg-gray-50 dark:bg-gray-900/50">
                <div class="flex justify-between items-center mb-4">
                    <span class="text-lg font-bold text-gray-900 dark:text-white">Total:</span>
                    <span id="cartTotal" class="text-2xl font-bold text-primary">R$ 0,00</span>
                </div>
                <button id="checkoutBtn" class="w-full rounded-lg h-12 px-5 bg-primary text-gray-900 font-bold hover:bg-opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
                    Finalizar Compra
                </button>
            </div>
        </div>
    `;
    
    const overlay = document.createElement('div');
    overlay.id = 'cartOverlay';
    overlay.className = 'fixed inset-0 bg-black/50 z-40 opacity-0 invisible transition-all duration-300';
    
    document.body.appendChild(overlay);
    document.body.appendChild(cartSidebar);
    
    // Event listeners
    document.getElementById('closeCart').addEventListener('click', closeCart);
    overlay.addEventListener('click', closeCart);
    document.getElementById('checkoutBtn').addEventListener('click', handleCheckout);
}

function openCart() {
    const sidebar = document.getElementById('cartSidebar');
    const overlay = document.getElementById('cartOverlay');
    
    if (sidebar && overlay) {
        sidebar.classList.remove('translate-x-full');
        overlay.classList.remove('opacity-0', 'invisible');
        document.body.style.overflow = 'hidden';
    } else {
        // Tentar criar novamente se não existir
        if (!sidebar) {
            createCartSidebar();
            setTimeout(() => openCart(), 100);
        }
    }
}

function closeCart() {
    const sidebar = document.getElementById('cartSidebar');
    const overlay = document.getElementById('cartOverlay');
    
    if (sidebar && overlay) {
        sidebar.classList.add('translate-x-full');
        overlay.classList.add('opacity-0', 'invisible');
        document.body.style.overflow = '';
    }
}

// ============================================
// BOTÃO FLUTUANTE DO CARRINHO
// ============================================
function createFloatingCartButton() {
    // Verificar se já existe
    if (document.getElementById('floatingCartButton')) return;
    
    const floatingBtn = document.createElement('button');
    floatingBtn.id = 'floatingCartButton';
    floatingBtn.className = 'fixed bottom-6 right-6 z-40 flex items-center justify-center w-16 h-16 bg-primary text-gray-900 rounded-full shadow-2xl hover:bg-opacity-90 transition-all duration-300 transform translate-y-0 opacity-0 invisible group';
    floatingBtn.innerHTML = `
        <span class="material-symbols-outlined text-3xl">shopping_cart</span>
        <span id="floatingCartCount" class="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center hidden">0</span>
        <div class="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap">
            Ver Carrinho
            <div class="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
    `;
    
    floatingBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openCart();
    });
    
    document.body.appendChild(floatingBtn);
}

function updateFloatingCartButton(totalItems) {
    const floatingBtn = document.getElementById('floatingCartButton');
    const floatingCount = document.getElementById('floatingCartCount');
    
    // Garantir que o botão existe
    if (!floatingBtn) {
        createFloatingCartButton();
        // Aguardar criação e tentar novamente
        setTimeout(() => updateFloatingCartButton(totalItems), 100);
        return;
    }
    
    if (floatingCount) {
        floatingCount.textContent = totalItems;
        if (totalItems > 0) {
            floatingCount.classList.remove('hidden');
        } else {
            floatingCount.classList.add('hidden');
        }
    }
    
    // Se houver itens, SEMPRE mostrar o botão flutuante
    if (totalItems > 0) {
        floatingBtn.classList.add('animate-bounce-subtle');
        // Forçar visibilidade quando há itens
        floatingBtn.classList.remove('opacity-0', 'invisible', 'translate-y-20');
        floatingBtn.classList.add('opacity-100', 'visible', 'translate-y-0');
    } else {
        floatingBtn.classList.remove('animate-bounce-subtle');
        // Se não houver itens, verificar scroll
        const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
        if (currentScroll <= 200) {
            floatingBtn.classList.add('opacity-0', 'invisible', 'translate-y-20');
            floatingBtn.classList.remove('opacity-100', 'visible', 'translate-y-0');
        }
    }
}

function initFloatingCartButtonScroll() {
    const floatingBtn = document.getElementById('floatingCartButton');
    if (!floatingBtn) {
        // Tentar criar novamente se não existir
        setTimeout(() => {
            createFloatingCartButton();
            initFloatingCartButtonScroll();
        }, 100);
        return;
    }
    
    let ticking = false;
    const scrollThreshold = 200; // Mostrar após 200px de scroll
    
    function updateFloatingButtonVisibility() {
        const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        
        // Se houver itens no carrinho, SEMPRE mostrar o botão flutuante
        // independente da posição do scroll
        if (totalItems > 0) {
            floatingBtn.classList.remove('opacity-0', 'invisible', 'translate-y-20');
            floatingBtn.classList.add('opacity-100', 'visible', 'translate-y-0');
        } 
        // Se não houver itens, mostrar apenas após scroll significativo
        else if (currentScroll > scrollThreshold) {
            floatingBtn.classList.remove('opacity-0', 'invisible', 'translate-y-20');
            floatingBtn.classList.add('opacity-100', 'visible', 'translate-y-0');
        } 
        // Ocultar quando está no topo e não há itens
        else {
            floatingBtn.classList.add('opacity-0', 'invisible', 'translate-y-20');
            floatingBtn.classList.remove('opacity-100', 'visible', 'translate-y-0');
        }
        
        ticking = false;
    }
    
    // Usar throttle para melhor performance
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(updateFloatingButtonVisibility);
            ticking = true;
        }
    }, { passive: true });
    
    // Verificar estado inicial
    setTimeout(() => {
        updateFloatingButtonVisibility();
    }, 150);
}

function updateCartUI() {
    // Calcular total de itens
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    // Atualizar contador no header
    const cartCountElements = document.querySelectorAll('#cartCount, #mobileCartCount, #floatingCartCount');
    cartCountElements.forEach(el => {
        if (el) {
            el.textContent = totalItems;
            if (totalItems > 0) {
                el.classList.remove('hidden');
            } else {
                el.classList.add('hidden');
            }
        }
    });
    
    // Atualizar botão flutuante
    updateFloatingCartButton(totalItems);
    
    // Renderizar itens do carrinho (preserva scroll internamente)
    renderCartItems();
    
    // Calcular total
    cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const cartTotalEl = document.getElementById('cartTotal');
    if (cartTotalEl) {
        cartTotalEl.textContent = formatCurrency(cartTotal);
    }
    
    // Atualizar botão de checkout
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        checkoutBtn.disabled = cart.length === 0;
    }
}

function renderCartItems() {
    const cartItems = document.getElementById('cartItems');
    if (!cartItems) return;
    
    // Preservar a posição de scroll antes de atualizar
    const scrollPosition = cartItems.scrollTop;
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="text-center text-gray-600 dark:text-gray-400 py-8">Seu carrinho está vazio</p>';
        return;
    }
    
    // Renderização completa SEM animação para evitar "pulos"
    cartItems.innerHTML = cart.map((item, index) => `
        <div class="flex gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-4" data-cart-item-index="${index}">
            <div class="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                <span class="material-symbols-outlined text-2xl text-primary">medication</span>
            </div>
            <div class="flex-1">
                <h3 class="font-bold text-gray-900 dark:text-white">${escapeHtml(item.name)}</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">${formatCurrency(item.price)} cada</p>
                <p class="text-xs text-gray-500 dark:text-gray-500 cart-item-subtotal">Subtotal: ${formatCurrency(item.price * item.quantity)}</p>
                <div class="flex items-center gap-2 mt-2">
                    <button onclick="updateQuantity(${index}, -1)" class="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors" aria-label="Diminuir quantidade">
                        <span class="material-symbols-outlined text-sm">remove</span>
                    </button>
                    <span class="font-bold text-gray-900 dark:text-white min-w-[2rem] text-center cart-item-quantity">${item.quantity}</span>
                    <button onclick="updateQuantity(${index}, 1)" class="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors" aria-label="Aumentar quantidade">
                        <span class="material-symbols-outlined text-sm">add</span>
                    </button>
                    <button onclick="removeFromCart(${index})" class="ml-auto px-3 py-1 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                        Remover
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    // Restaurar posição de scroll imediatamente após renderização
    // Usar double requestAnimationFrame para garantir que o DOM foi totalmente atualizado
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            if (cartItems) {
                cartItems.scrollTop = scrollPosition;
            }
        });
    });
}

// ============================================
// PRODUTOS - ADICIONAR AO CARRINHO
// ============================================
function initProductButtons() {
    // Encontrar todos os botões "Adicionar ao Carrinho"
    const allButtons = document.querySelectorAll('button');
    const addToCartButtons = Array.from(allButtons).filter(btn => 
        btn.classList.contains('btn-add-cart') || btn.textContent.includes('Adicionar ao Carrinho')
    );
    
    addToCartButtons.forEach((button) => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Encontrar o card do produto (pode estar em diferentes níveis)
            let productCard = button.closest('[data-product-id]');
            
            // Se não encontrar por data attribute, procurar pelo parent
            if (!productCard) {
                productCard = button.closest('.flex.flex-col');
            }
            
            if (!productCard) return;
            
            // Tentar usar data attributes primeiro
            const productId = productCard.dataset.productId;
            const productName = productCard.dataset.productName;
            const productPrice = productCard.dataset.productPrice;
            
            if (productId && productName && productPrice) {
                // Usar data attributes
                addToCart({
                    id: `product-${productId}`,
                    name: productName,
                    price: parseFloat(productPrice),
                    quantity: 1
                });
            } else {
                // Fallback: extrair do DOM
                const nameElement = productCard.querySelector('p.text-base.font-medium, p.font-medium');
                const productNameFallback = nameElement?.textContent?.trim() || 'Produto';
                
                const priceElements = productCard.querySelectorAll('p.text-sm, p.text-gray-600');
                let priceText = '0,00';
                priceElements.forEach(el => {
                    const text = el.textContent?.trim() || '';
                    if (text.includes('R$')) {
                        priceText = text;
                    }
                });
                
                const price = parseFloat(priceText.replace('R$', '').replace(',', '.').trim()) || 0;
                
                addToCart({
                    id: `product-${Date.now()}`,
                    name: productNameFallback,
                    price: price,
                    quantity: 1
                });
            }
        });
    });
}

function addToCart(product) {
    // Verificar se o produto já existe no carrinho
    const existingItemIndex = cart.findIndex(item => item.id === product.id);
    
    if (existingItemIndex !== -1) {
        // Produto já existe, incrementar quantidade
        cart[existingItemIndex].quantity += 1;
    } else {
        // Novo produto, adicionar ao carrinho
        cart.push({ ...product });
    }
    
    updateCartUI();
    saveCartToStorage();
    showNotification(`${product.name} adicionado ao carrinho!`);
    
    // Garantir que o botão flutuante aparece quando adiciona item
    // SEMPRE mostrar quando há itens, independente do scroll
    const floatingBtn = document.getElementById('floatingCartButton');
    if (floatingBtn) {
        floatingBtn.classList.remove('opacity-0', 'invisible', 'translate-y-20');
        floatingBtn.classList.add('opacity-100', 'visible', 'translate-y-0');
    }
}

// Funções globais para onclick (usadas no HTML gerado)
window.updateQuantity = function(index, change) {
    if (cart[index] !== undefined) {
        // Preservar posição de scroll antes de qualquer mudança
        const cartItemsContainer = document.getElementById('cartItems');
        const scrollPosition = cartItemsContainer ? cartItemsContainer.scrollTop : 0;
        
        cart[index].quantity += change;
        
        if (cart[index].quantity <= 0) {
            const productName = cart[index].name;
            cart.splice(index, 1);
            showNotification(`${productName} removido do carrinho`);
        }
        
        // Atualizar UI preservando scroll
        updateCartUI();
        
        // Restaurar posição de scroll após atualização
        if (cartItemsContainer) {
            // Usar múltiplos requestAnimationFrame para garantir que o DOM foi atualizado
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    cartItemsContainer.scrollTop = scrollPosition;
                });
            });
        }
        
        saveCartToStorage();
    }
};

window.removeFromCart = function(index) {
    if (cart[index] !== undefined) {
        const productName = cart[index].name;
        cart.splice(index, 1);
        updateCartUI();
        saveCartToStorage();
        showNotification(`${productName} removido do carrinho`);
    }
};

function handleCheckout() {
    if (cart.length === 0) {
        showNotification('Seu carrinho está vazio!', 'error');
        return;
    }
    
    const total = formatCurrency(cartTotal);
    const itemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    if (confirm(`Finalizar compra de ${itemsCount} item(ns)?\nTotal: ${total}`)) {
        showNotification('Compra finalizada com sucesso! Em breve entraremos em contato.', 'success');
        cart = [];
        updateCartUI();
        saveCartToStorage();
        closeCart();
    }
}

// ============================================
// VALIDAÇÃO DE FORMULÁRIO
// ============================================
function initFormValidation() {
    const form = document.querySelector('form');
    if (!form) return;
    
    form.addEventListener('submit', handleFormSubmit);
    
    // Validação em tempo real
    const inputs = form.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.addEventListener('blur', () => validateField(input));
        input.addEventListener('input', () => clearError(input));
    });
}

function validateField(field) {
    const value = field.value.trim();
    let isValid = true;
    let errorMessage = '';
    
    field.classList.remove('border-red-500', 'border-green-500');
    
    switch(field.id) {
        case 'name':
            if (value.length < 3) {
                isValid = false;
                errorMessage = 'Nome deve ter pelo menos 3 caracteres';
            }
            break;
        case 'email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                isValid = false;
                errorMessage = 'E-mail inválido';
            }
            break;
        case 'phone':
            const digitsOnly = value.replace(/\D/g, '');
            if (digitsOnly.length < 10 || digitsOnly.length > 11) {
                isValid = false;
                errorMessage = 'Telefone inválido';
            }
            break;
        case 'message':
            if (value.length < 10) {
                isValid = false;
                errorMessage = 'Mensagem deve ter pelo menos 10 caracteres';
            }
            break;
    }
    
    if (!isValid) {
        field.classList.add('border-red-500');
        showFieldError(field, errorMessage);
    } else if (value) {
        field.classList.add('border-green-500');
    }
    
    return isValid;
}

function showFieldError(field, message) {
    let errorEl = field.parentElement.querySelector('.error-message');
    if (!errorEl) {
        errorEl = document.createElement('p');
        errorEl.className = 'error-message text-red-500 text-xs mt-1';
        field.parentElement.appendChild(errorEl);
    }
    errorEl.textContent = message;
}

function clearError(field) {
    field.classList.remove('border-red-500', 'border-green-500');
    const errorEl = field.parentElement.querySelector('.error-message');
    if (errorEl) errorEl.remove();
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const inputs = form.querySelectorAll('input, textarea');
    let isFormValid = true;
    
    inputs.forEach(input => {
        if (!validateField(input)) {
            isFormValid = false;
        }
    });
    
    if (isFormValid) {
        // Simular envio
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        showNotification('Mensagem enviada com sucesso! Entraremos em contato em breve.', 'success');
        form.reset();
        inputs.forEach(input => clearError(input));
        
        console.log('Formulário enviado:', data);
    } else {
        const firstError = form.querySelector('.border-red-500');
        if (firstError) {
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstError.focus();
        }
    }
}

// ============================================
// MÁSCARA DE TELEFONE
// ============================================
function initPhoneMask() {
    const phoneInput = document.getElementById('phone');
    if (!phoneInput) return;
    
    phoneInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        
        if (value.length <= 10) {
            value = value.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        } else {
            value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        }
        
        e.target.value = value;
    });
}

// ============================================
// SCROLL SUAVE
// ============================================
function initSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href === '#' || !href) return;
            
            const targetId = href.substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                e.preventDefault();
                const headerHeight = 80;
                const targetPosition = targetElement.offsetTop - headerHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ============================================
// ANIMAÇÕES DE SCROLL
// ============================================
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fadeIn');
                entry.target.style.opacity = '1';
            }
        });
    }, observerOptions);
    
    // Observar seções e cards
    const elementsToAnimate = document.querySelectorAll('section, .flex.flex-col.gap-3.pb-3');
    elementsToAnimate.forEach(el => {
        el.style.opacity = '0';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// ============================================
// BOTÕES DO HERO
// ============================================
function initHeroButtons() {
    const allButtons = Array.from(document.querySelectorAll('button'));
    const buyNowBtn = allButtons.find(btn => 
        btn.textContent.includes('Comprar Agora')
    );
    const servicesBtn = allButtons.find(btn => 
        btn.textContent.includes('Nossos Serviços')
    );
    
    if (buyNowBtn) {
        buyNowBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const produtosSection = document.getElementById('produtos');
            if (produtosSection) {
                const headerHeight = 80;
                const targetPosition = produtosSection.offsetTop - headerHeight;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    }
    
    if (servicesBtn) {
        servicesBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const sobreSection = document.getElementById('sobre');
            if (sobreSection) {
                const headerHeight = 80;
                const targetPosition = sobreSection.offsetTop - headerHeight;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    }
}

// ============================================
// UTILITÁRIOS
// ============================================
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function saveCartToStorage() {
    localStorage.setItem('devfarm_cart', JSON.stringify(cart));
}

function loadCartFromStorage() {
    const savedCart = localStorage.getItem('devfarm_cart');
    if (savedCart) {
        try {
            cart = JSON.parse(savedCart);
            // Garantir que o botão flutuante seja atualizado
            if (cart.length > 0) {
                setTimeout(() => {
                    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
                    updateFloatingCartButton(totalItems);
                }, 200);
            }
        } catch (e) {
            console.error('Erro ao carregar carrinho:', e);
            cart = [];
        }
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
    
    notification.className = `fixed top-20 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300`;
    notification.innerHTML = `
        <div class="flex items-center gap-2">
            <span class="material-symbols-outlined">${type === 'success' ? 'check_circle' : 'error'}</span>
            <span>${escapeHtml(message)}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // Remover após 3 segundos
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}

// Adicionar estilos de animação dinamicamente (fallback caso CSS não carregue)
// Executar após um pequeno delay para garantir que o DOM está pronto
setTimeout(() => {
    const cssLink = document.querySelector('link[href="style.css"]');
    if (!cssLink || !cssLink.sheet) {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateX(20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            .animate-slideIn {
                animation: slideIn 0.3s ease;
            }
            
            @keyframes fadeIn {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .animate-fadeIn {
                animation: fadeIn 0.6s ease;
            }
        `;
        document.head.appendChild(style);
    }
}, 100);
