db = db.getSiblingDB(''biomedical_qa'');

db.createUser({
  user: ''biomedical_app'',
  pwd: ''app_password'',
  roles: [
    {
      role: ''readWrite'',
      db: ''biomedical_qa''
    }
  ]
});

db.createCollection(''users'');
db.createCollection(''conversations'');
db.createCollection(''datasets'');
db.createCollection(''favorites'');

print(''MongoDB initialized successfully'');
