

dim(dhcb_health_medium1)

colnames(dhcb_health_medium1)

dhcb_health_medium1.Scaled <- scale(dhcb_health_medium1[,3:51])


head(dhcb_health_medium1.Scaled)

str(dhcb_health_medium1.Scaled)


sum(is.na(dhcb_health_medium1.Scaled))

colnames(dhcb_health_medium1.Scaled)

lapply()
#[42] "Mobile.Health.Clinic.(Numbers)"                                     
#[43] "Mobile.Health.Clinic.Doctors.Total.Strength.(Numbers)"              
#[44] "Mobile.Health.Clinic.Doctors.In.Position.(Numbers)"  
#[26] "Hospital.Allopathic.(Numbers)"                                      
#[27] "Hospital.Allopathic.Doctors.Total.Strength.(Numbers)"               
#[28] "Hospital.Allopathic.Doctors.In.Position.(Numbers)"   
dhcb_health_medium1.Scaled1<-dhcb_health_medium1.Scaled[,-c(26,27,28,42,43,44)]

wssplot <- function(data, nc=15, seed=3110){
  wss <- (nrow(data)-1)*sum(apply(data,2,var))
  for (i in 2:nc){
    set.seed(seed)
    wss[i] <- sum(kmeans(data, centers=i)$withinss)}
  plot(1:nc, wss, type="b", xlab="Number of Clusters",
       ylab="Within groups sum of squares")}

wssplot(dhcb_health_medium1.Scaled1, nc=5)


kmeans.clus = kmeans(x=dhcb_health_medium1.Scaled1, centers = 4, nstart = 3)

dhcb_health_medium1$Clusters <- kmeans.clus$cluster


aggr = aggregate(dhcb_health_medium1[,-c(1,2,28,29,30,44,45,46)],list(dhcb_health_medium1$Clusters),mean)


colnames(dhcb_health_medium1)
write.csv(dhcb_health_medium1,file="dhcb_health_medium1.csv")

write.csv(aggr,file="dhcb_health_medium11.csv")

getwd()
