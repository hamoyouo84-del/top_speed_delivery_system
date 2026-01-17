// 1. إدارة البيانات (Local Storage)
const TopSpeedDB = {
    save: (key, data) => localStorage.setItem('ts_' + key, JSON.stringify(data)),
    load: (key) => JSON.parse(localStorage.getItem('ts_' + key)) || [],
    clear: () => {
        if(confirm("هل تريد تصفير جميع بيانات النظام؟ (سيتم حذف كل شيء)")) {
            localStorage.clear();
            location.reload();
        }
    }
};

// 2. تحميل البيانات الأولية
let drivers = TopSpeedDB.load('drivers');
let orders = TopSpeedDB.load('orders');

// 3. شاشة التحميل
window.onload = () => {
    let count = 0;
    const interval = setInterval(() => {
        count += 10;
        document.getElementById('counter').innerText = count + "%";
        if (count >= 100) {
            clearInterval(interval);
            document.getElementById('loaderWrapper').style.display = 'none';
            document.getElementById('mainSystem').style.display = 'flex';
            document.body.classList.remove('overflow-hidden');
            renderAll();
        }
    }, 50);
};

// 4. إضافة مندوب جديد
function addNewDriver() {
    const name = document.getElementById('newDriverName').value.trim();
    const phone = document.getElementById('newDriverPhone').value.trim();
    const code = document.getElementById('newDriverCode').value.trim();

    if(!name || !phone || !code) return alert("برجاء إدخال بيانات المندوب كاملة");

    // الحالة الافتراضية عند التسجيل هي "متاح"
    drivers.push({ name, phone, code, status: 'متاح' });
    TopSpeedDB.save('drivers', drivers);
    
    document.getElementById('newDriverName').value = '';
    document.getElementById('newDriverPhone').value = '';
    document.getElementById('newDriverCode').value = '';
    renderAll();
    alert("تم تفعيل المندوب بنجاح");
}

// 5. إضافة أوردر وإرساله واتساب
function addNewOrder() {
    const rest = document.getElementById('restName').value.trim();
    const type = document.getElementById('orderType').value.trim() || 'أوردر عام';
    const customer = document.getElementById('customerName').value.trim() || 'غير محدد';
    const phone = document.getElementById('customerPhone').value.trim();
    const addr = document.getElementById('orderAddress').value.trim();
    const price = document.getElementById('orderPrice').value.trim();
    const dSelect = document.getElementById('driverSelect');

    if(!rest || !addr || !price || !dSelect.value) return alert("أكمل البيانات الأساسية واختار المندوب");

    // إيجاد بيانات المندوب المختار
    const dIndex = drivers.findIndex(d => d.name === dSelect.value);
    const selectedDriver = drivers[dIndex];

    const newOrder = {
        id: Date.now(),
        rest, type, customer, phone, addr,
        price: parseFloat(price),
        driverName: selectedDriver.name,
        driverPhone: selectedDriver.phone,
        status: 'معلق'
    };

    // 1. حفظ الأوردر وتغيير حالة المندوب لـ "مشغول"
    orders.push(newOrder);
    drivers[dIndex].status = 'مشغول';
    
    TopSpeedDB.save('orders', orders);
    TopSpeedDB.save('drivers', drivers);
    
    // 2. تصفير الخانات
    ['restName', 'orderType', 'customerName', 'customerPhone', 'orderAddress', 'orderPrice'].forEach(id => {
        document.getElementById(id).value = '';
    });

    renderAll();

    // 3. فتح شات المندوب فوراً بالبيانات
    const msg = `*طلب جديد من TOP SPEED* 🚀%0A%0A` +
                `*🏪 المطعم:* ${newOrder.rest}%0A` +
                `*📦 النوع:* ${newOrder.type}%0A` +
                `*👤 العميل:* ${newOrder.customer}%0A` +
                `*📞 تليفون:* ${newOrder.phone}%0A` +
                `*📍 العنوان:* ${newOrder.addr}%0A` +
                `*💰 المطلوب:* ${newOrder.price} EGP`;
    
    window.open(`https://wa.me/2${newOrder.driverPhone}?text=${msg}`, '_blank');
}

// 6. تأكيد التسليم (الأوردر يخلص والمندوب يفضى)
function completeOrder(orderId) {
    const oIdx = orders.findIndex(o => o.id === orderId);
    if(oIdx === -1) return;

    const driverName = orders[oIdx].driverName;
    orders[oIdx].status = 'تم التسليم';

    // إرجاع المندوب لحالة "متاح"
    const dIdx = drivers.findIndex(d => d.name === driverName);
    if(dIdx !== -1) drivers[dIdx].status = 'متاح';

    TopSpeedDB.save('orders', orders);
    TopSpeedDB.save('drivers', drivers);
    renderAll();
}

// 7. تحديث الواجهة والفلتر
function renderAll() {
    const filterValue = document.getElementById('filterDriver')?.value || 'all';
    
    // جدول الأوردرات
    const tableBody = document.getElementById('ordersTableBody');
    let filteredOrders = orders;
    if (filterValue !== 'all') filteredOrders = orders.filter(o => o.driverName === filterValue);

    tableBody.innerHTML = filteredOrders.map(o => `
        <tr class="border-b bg-white hover:bg-slate-50 transition">
            <td class="p-4"><b>${o.rest}</b><br><span class="text-[10px] text-blue-500 font-bold">${o.type}</span></td>
            <td class="p-4 text-xs font-bold">
                ${o.customer}<br>
                <a href="tel:${o.phone}" class="text-green-600">${o.phone}</a><br>
                <a href="https://www.google.com/maps/search/${encodeURIComponent(o.addr)}" target="_blank" class="text-slate-400 font-normal"><i class="fas fa-map-marker-alt"></i> ${o.addr}</a>
            </td>
            <td class="p-4 font-black text-slate-900">${o.price} EGP</td>
            <td class="p-4 text-xs font-bold text-slate-600">${o.driverName}</td>
            <td class="p-4 text-center">
                ${o.status === 'تم التسليم' 
                    ? `<span class="text-green-600 font-black text-[10px]">تم التسليم ✅</span>`
                    : `<button onclick="completeOrder(${o.id})" class="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black">تأكيد التسليم</button>`
                }
            </td>
        </tr>
    `).reverse().join('');

    // شبكة المناديب (الحالة متاح/مشغول)
    const grid = document.getElementById('driversGrid');
    grid.innerHTML = drivers.map(d => `
        <div class="bg-white p-4 rounded-xl shadow-sm border-r-4 ${d.status === 'متاح' ? 'border-green-500' : 'border-orange-500'} flex justify-between items-center">
            <div>
                <div class="font-bold text-slate-700">${d.name}</div>
                <div class="text-[10px] text-slate-400 font-bold">${d.phone}</div>
            </div>
            <div class="text-[10px] font-black uppercase ${d.status === 'متاح' ? 'text-green-500' : 'text-orange-500'}">
                <i class="fas fa-circle text-[8px] ml-1"></i> ${d.status}
            </div>
        </div>
    `).join('');

    // تحديث القوائم (Select)
    const dSelect = document.getElementById('driverSelect');
    const fSelect = document.getElementById('filterDriver');
    
    const options = drivers.map(d => `<option value="${d.name}">${d.name} (${d.status})</option>`).join('');
    dSelect.innerHTML = '<option value="" disabled selected>-- اختر المندوب --</option>' + options;
    fSelect.innerHTML = '<option value="all">عرض جميع المناديب</option>' + options;
    fSelect.value = filterValue;

    // تحديث الرصيد
    const total = orders.filter(o => o.status === 'تم التسليم').reduce((sum, o) => sum + o.price, 0);
    document.getElementById('dailyIncome').innerText = total.toLocaleString();
}

// التنقل
function showSection(id) {
    document.getElementById('ordersSection').classList.toggle('hidden', id !== 'orders');
    document.getElementById('driversSection').classList.toggle('hidden', id !== 'drivers');
}
