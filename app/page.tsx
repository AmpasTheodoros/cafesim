"use client"

import React, { useState, useEffect } from 'react';
import { Coffee, Clock, DollarSign, User, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const GRID_SIZE = 10;
const TILE_SIZE = 50;
const MOVEMENT_SPEED = 4; // pixels per frame

const CafeSimulator = () => {
  const [money, setMoney] = useState(100);
  const [customers, setCustomers] = useState([]);
  const [playerPosition, setPlayerPosition] = useState({ x: 250, y: 250 }); // Pixel-based position
  const [holding, setHolding] = useState(null);
  const [gameStatus, setGameStatus] = useState('running');
  const [movementKeys, setMovementKeys] = useState({
    up: false,
    down: false,
    left: false,
    right: false
  });

  const stations = [
    { id: 'coffee', x: 50, y: 50, type: 'coffee', name: 'Espresso', icon: '☕️' },
    { id: 'latte', x: 100, y: 50, type: 'latte', name: 'Latte', icon: '🥛' },
    { id: 'croissant', x: 150, y: 50, type: 'croissant', name: 'Croissant', icon: '🥐' },
    { id: 'cake', x: 200, y: 50, type: 'cake', name: 'Cake', icon: '🍰' },
  ];

  const MENU_ITEMS = [
    { id: 1, name: 'Espresso', price: 3, prepTime: 2000, icon: '☕️', type: 'coffee' },
    { id: 2, name: 'Latte', price: 4, prepTime: 3000, icon: '🥛', type: 'latte' },
    { id: 3, name: 'Croissant', price: 3, prepTime: 1500, icon: '🥐', type: 'croissant' },
    { id: 4, name: 'Cake', price: 5, prepTime: 2000, icon: '🍰', type: 'cake' },
  ];

  // Generate customer
  const generateCustomer = () => {
    const orderItems = [];
    const itemCount = Math.floor(Math.random() * 2) + 1;
    const availableSeats = [
      { x: 400, y: 100 },
      { x: 400, y: 200 },
      { x: 400, y: 300 },
    ];
    
    for (let i = 0; i < itemCount; i++) {
      const randomItem = MENU_ITEMS[Math.floor(Math.random() * MENU_ITEMS.length)];
      orderItems.push({ ...randomItem });
    }

    const seat = availableSeats[Math.floor(Math.random() * availableSeats.length)];

    return {
      id: Date.now(),
      items: orderItems,
      patience: 30000,
      status: 'waiting',
      position: seat,
      servedItems: [],
    };
  };

  // Smooth movement handling
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if (['w', 'arrowup'].includes(key)) setMovementKeys(prev => ({ ...prev, up: true }));
      if (['s', 'arrowdown'].includes(key)) setMovementKeys(prev => ({ ...prev, down: true }));
      if (['a', 'arrowleft'].includes(key)) setMovementKeys(prev => ({ ...prev, left: true }));
      if (['d', 'arrowright'].includes(key)) setMovementKeys(prev => ({ ...prev, right: true }));
      if (key === ' ') handleAction();
    };

    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      if (['w', 'arrowup'].includes(key)) setMovementKeys(prev => ({ ...prev, up: false }));
      if (['s', 'arrowdown'].includes(key)) setMovementKeys(prev => ({ ...prev, down: false }));
      if (['a', 'arrowleft'].includes(key)) setMovementKeys(prev => ({ ...prev, left: false }));
      if (['d', 'arrowright'].includes(key)) setMovementKeys(prev => ({ ...prev, right: false }));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [holding]);

  // Movement animation
  useEffect(() => {
    const movePlayer = () => {
      setPlayerPosition(prev => {
        let newX = prev.x;
        let newY = prev.y;

        if (movementKeys.up) newY = Math.max(25, prev.y - MOVEMENT_SPEED);
        if (movementKeys.down) newY = Math.min(475, prev.y + MOVEMENT_SPEED);
        if (movementKeys.left) newX = Math.max(25, prev.x - MOVEMENT_SPEED);
        if (movementKeys.right) newX = Math.min(475, prev.x + MOVEMENT_SPEED);

        return { x: newX, y: newY };
      });
    };

    const animationFrame = requestAnimationFrame(function animate() {
      movePlayer();
      requestAnimationFrame(animate);
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [movementKeys]);

  // Customer generation
  useEffect(() => {
    const customerInterval = setInterval(() => {
      if (customers.length < 3 && gameStatus === 'running') {
        setCustomers(prev => [...prev, generateCustomer()]);
      }
    }, 5000);

    return () => clearInterval(customerInterval);
  }, [customers.length, gameStatus]);

  // Customer patience
  useEffect(() => {
    const timer = setInterval(() => {
      setCustomers(prev => 
        prev.map(customer => {
          if (customer.status === 'waiting') {
            const newPatience = customer.patience - 1000;
            if (newPatience <= 0) {
              setMoney(prev => Math.max(0, prev - 2));
              return { ...customer, status: 'left' };
            }
            return { ...customer, patience: newPatience };
          }
          return customer;
        })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleAction = () => {
    // Check if player is near a station
    const station = stations.find(s => 
      Math.abs(s.x - playerPosition.x) <= 40 && 
      Math.abs(s.y - playerPosition.y) <= 40
    );

    if (station && !holding) {
      setHolding({ type: station.type, icon: station.icon, name: station.name });
      return;
    }

    // Check if player is near a customer
    const customer = customers.find(c => 
      Math.abs(c.position.x - playerPosition.x) <= 40 && 
      Math.abs(c.position.y - playerPosition.y) <= 40 &&
      c.status === 'waiting'
    );

    if (customer && holding) {
      const orderedItem = customer.items.find(item => 
        item.type === holding.type && 
        !customer.servedItems.includes(item.id)
      );

      if (orderedItem) {
        setCustomers(prev => 
          prev.map(c => {
            if (c.id === customer.id) {
              const newServedItems = [...c.servedItems, orderedItem.id];
              const allItemsServed = newServedItems.length === c.items.length;
              
              if (allItemsServed) {
                const orderTotal = c.items.reduce((sum, item) => sum + item.price, 0);
                setMoney(prev => prev + orderTotal);
                return { ...c, status: 'served' };
              }
              
              return { ...c, servedItems: newServedItems };
            }
            return c;
          })
        );
        setHolding(null);
      }
    }
  };

  // Clean up served customers
  useEffect(() => {
    const cleanup = setInterval(() => {
      setCustomers(prev => prev.filter(c => c.status !== 'served' && c.status !== 'left'));
    }, 1000);

    return () => clearInterval(cleanup);
  }, []);

  return (
    <div className="w-full max-w-6xl p-4 bg-amber-50 rounded-lg">
      <div className="flex justify-between items-center mb-6 bg-amber-100 p-4 rounded-lg">
        <h1 className="text-2xl font-bold text-amber-800">Cozy Corner Café</h1>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2 bg-green-100 px-3 py-1 rounded-full">
            <DollarSign className="w-4 h-4 text-green-600" />
            <span className="font-bold text-green-600">${money}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Game Area */}
        <div className="lg:col-span-2">
          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="relative w-full h-96 bg-amber-50 rounded-lg overflow-hidden">
                {/* Stations */}
                {stations.map(station => (
                  <div
                    key={station.id}
                    className="absolute w-12 h-12 flex items-center justify-center text-2xl"
                    style={{
                      left: station.x,
                      top: station.y,
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    <div className="bg-amber-100 p-2 rounded-lg">
                      {station.icon}
                    </div>
                  </div>
                ))}

                {/* Customers */}
                {customers.map(customer => (
                  <div
                    key={customer.id}
                    className="absolute w-12 h-12 flex items-center justify-center"
                    style={{
                      left: customer.position.x,
                      top: customer.position.y,
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    <div className="relative">
                      <div className="text-2xl">👤</div>
                      {customer.status === 'waiting' && (
                        <div className="absolute -top-2 -right-2 text-xs bg-amber-100 rounded-full px-1">
                          {Math.ceil(customer.patience / 1000)}s
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Player */}
                <div
                  className="absolute w-12 h-12 transition-transform"
                  style={{
                    left: playerPosition.x,
                    top: playerPosition.y,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <div className="relative">
                    <div className="w-10 h-10 bg-amber-600 rounded-full flex items-center justify-center text-white text-xl">
                      {holding ? holding.icon : '👤'}
                    </div>
                    {holding && (
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white px-2 py-1 rounded-lg text-xs whitespace-nowrap shadow-md">
                        Holding: {holding.name}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 text-sm text-gray-600">
                Use WASD or arrow keys to move. Press SPACE to pick up/serve items.
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders Panel */}
        <Card className="bg-white">
          <CardContent className="p-4">
            <h2 className="text-lg font-bold mb-4 text-amber-800">Current Orders</h2>
            <div className="space-y-2">
              {customers.filter(c => c.status === 'waiting').map(customer => (
                <div 
                  key={customer.id}
                  className="p-3 rounded-lg bg-amber-50"
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span className="font-medium">
                        Order #{customer.id.toString().slice(-4)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{Math.ceil(customer.patience / 1000)}s</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {customer.items.map((item, idx) => (
                      <span 
                        key={idx}
                        className={`px-2 py-1 rounded-full text-sm ${
                          customer.servedItems.includes(item.id)
                            ? 'bg-green-100 text-green-700'
                            : 'bg-white'
                        }`}
                      >
                        {item.icon} {item.name}
                        {customer.servedItems.includes(item.id) && (
                          <Check className="w-4 h-4 inline ml-1" />
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {customers.filter(c => c.status === 'waiting').length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  No active orders
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CafeSimulator;